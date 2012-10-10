var app = require('http').createServer(handler);

var static = require('node-static');
var _ = require('underscore');

var redis = require('redis');
var sio = require('socket.io'),
    RedisStore = sio.RedisStore,
    io = sio.listen(app);

var state = {
  x: 0,
  y: 0
};

var queue = {};
queue.physics = [];

var config = require('./config');

// http config
var file = new(static.Server)('./public');

app.listen(config.port);
console.log('Server started, listening on port ' + config.port);

function handler (req, res) {
  req.addListener('end', function () {
    file.serve(req, res);
  });
}

// redis client config
var port = config.redis.port,
    host = config.redis.host,
    pass = config.redis.password;

// redis client init
var pub = redis.createClient(port, host);
var sub = redis.createClient(port, host);
var store = redis.createClient(port, host);

// redis auth
pub.auth(pass, function(err) {});
sub.auth(pass, function(err) {});
store.auth(pass, function(err) {});

var publishUsers = function() {
  // publish updated user list
  store.smembers('users', function(err, res) {
    // update the list of users in chat, client-side
    io.sockets.emit('user:update', res);
  });
};

var publishCommand = function(message) {
  store.hgetall(message, function(err, res) {
    console.log(res);
    store.hget('user:' + res.uid, 'name', function(err, username) {
      io.sockets.emit('command:update', username, res.text);
    });
  });
};

var publishState = function(state) {
  console.log('state: ', state);
  store.hmset('state', state, function(err, res) {
    io.sockets.emit('state:update', state);
  });
};

var publishChat = function(message) {
  store.hgetall(message, function(err, res) {
    console.log(res);
    store.hget('user:' + res.uid, 'name', function(err, username) {
      io.sockets.emit('chat:update', username, res.text);
    });
  });
};

// socket.io config
io.configure(function() {
  io.set('store', new RedisStore({ redisPub: pub, redisSub: sub, redisClient: store }));
});

// socket.io client event listeners
io.sockets.on('connection', function (socket) {
  var rc = redis.createClient(port, host);
  rc.auth(pass, function(err) {});

  io.sockets.emit('state:update', state);

  socket.on('user:add', function(username) {
    // add user to redis set
    rc.incr('users:uid:next', function(err, uid) {
      rc.multi()
      .hmset('user:' + uid, { name: username })
      .set('uid:' + username, uid)
      .sadd('users', username)
      .exec(function(err, res) {
        // store the username and uid in the socket session for this client
        socket.username = username;
        socket.uid = uid;

        // echo globally (all clients) that a person has connected
        io.sockets.emit('chat:update', 'SERVER', socket.username + ' has connected');

        publishUsers();
      });
    });
  })
  .on('command:send', function (command) {
    console.log(command);
    rc.incr('commands:id:next', function(err, id) {
      rc.hmset('command:' + id, { uid: socket.uid, text: command.data }, function(err, res) {
        // add to server physics queue instead of immeadiately publishing
        queue.physics.push({ data: 'command:' + id });
      });

      switch(command.data) {
        case 'forward':
          rc.incr('state:x', function(err, id) {
            state.x++;
          });
          break;
        case 'reverse':
          rc.decr('state:x', function(err, id) {
            state.x--;
          });
          break;
        case 'left':
          rc.incr('state:y', function(err, id) {
            state.y++;
          });
          break;
        case 'right':
          rc.decr('state:y', function(err, id) {
            state.y--;
          });
          break;
      }
    });
  })
  .on('chat:send', function (data) {
    rc.incr('messages:id:next', function(err, id) {
      rc.hmset('message:' + id, { uid: socket.uid, text: data }, function(err, res) {
        publishChat('message:' + id);
      });
    });
  })
  .on('disconnect', function() {
    socket.broadcast.emit('chat:update', 'SERVER', socket.username + ' has disconnected');

    // remove user from redis set
    rc.srem('users', socket.username, function(err, res) {
      publishUsers();
      rc.quit();
    });
  });
});

// TODO: replace with physics logic using dependency injection pattern
var valid = function(command) {
  if(true) {
    return command;
  }
};

// physics loop
var physics = function() {
  while (queue.physics.length > 0) {
    var command = valid(queue.physics.shift());

    if (command === undefined) {
      console.log('invalid');
    } else {
      console.log(command);

      // TODO: push updated position to game state object instead of publishing directly
      // updateState(command.data);
      publishCommand(command.data);
    }
  }
};

// init physics loop, fixed time step in milliseconds
setInterval(physics, 15);

// update loop
var update = function() {
  store.hgetall('state', function(err, res) {
    // publish game state
    // TODO: delta
    if (!_.isEqual(res, state)) {
      if (res.x != state.x || res.y != state.y) {
        console.log(res);
        console.log(state);
        publishState(state);
      }
    }
  });
};

// init server update loop, fixed time step in milliseconds
setInterval(update, 45);
