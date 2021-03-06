(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([
      '../core/core',
      '../core/time',
      '../core/types',
      './input',
      './ui',
      'stats',
      'raf'
    ], factory);
  }
})(this, function(core, time, types, input, ui) {

  // init stats
  var stats = new Stats();
  document.body.appendChild(stats.domElement);

  var actions = [];
  var entities = {};

  var init = function(client) {

    var clock = ui.init(client).clock;

    // set methods to run every frame
    this.actions = [
      this.clearCanvas,
      this.updateEntities,
      this.drawEntities,
      this.updateCamera
    ];

    // UI event listeners
    var listener = function(event) {
      var data = event.detail;
      var player = client.entities[client.uuid];

      if (player) {
        // ignore if gameover
        if (player.gameover || client.konami) return;

        // update isBlackout
        var intoxication = Math.min(data.intoxication, 100);
        if (intoxication >= 100) {
          player.setPublic({ 'isBlackout': true });

          // show end game screen
          ui.gameover(client, player);
        } 

        // update beer gauge level
        var level = (intoxication * 5) - 500;
        document.getElementById('beer').style.bottom = level + 'px';
        ui.updateFace(player);

        // update the Ammo Count
        ui.updateAmmo(player);

        // update timer
        var percent = player.timer.update();
        clock.animate(percent);

        // end game on timer expire
        // TODO: make this update from server side
        if (player.timer.now > player.timer.stop - player.timer.start) {
          player.gameover = true;

          // show end game screen
          ui.gameover(client, player);
        }

        // TODO: update ammo
      }
    }

    document.addEventListener('hud', listener);

    document.addEventListener('konami', function(event) {
      client.konami = true;
    });

    // init UI event emitter
    // TODO: emit events on state change rather than interval?
    setInterval(function() {
      updateUI(client);
    }, 1000);

    // socket.io client connection
    var socket = this.socket = io.connect();

    socket.on('game:load', function(data) {
      var character_id = getParameter('as');
      var charName = getParameter('name');

      socket.emit('player:select', { 'character-id' : character_id, name: charName });
    });

    // wait in queue
    socket.on('queue:enter', function(data) {
      ui.queue.enter(data);

      socket.on('queue:update', function(data) {
        ui.queue.update(data);
      });

      socket.on('queue:exit', function() {
        ui.queue.exit();
      });
    });

    // set client.uuid
    socket.on('uuid', function(data) {
      client.uuid = data;
    });

    // listen for full state updates
    socket.on('state:full', function(data) {

      // update server time (used for entity interpolation)
      time.server = data.time;
      time.client = time.server - core.offset;

      var uuid;

      var entities = _.union(Object.keys(client.entities), Object.keys(data.entities));
      var entity;

      var state;

      var msg = {};

      // iterate over union of client and server players
      for (var i = 0; i < entities.length; i++) {
        uuid = entities[i]
        entity = data.entities[uuid];

        if (entity && client.entities[uuid]) {
          // if defined on server and client, update state
          state = entity;
          client.entities[uuid].setPublic(state);
          client.entities[uuid].queue.server.push(client.entities[uuid].getState());
        } else if (entity) {
          // if defined on server but not on client, create new Entity on client
          state = entity;
          client.entities[uuid] = new types[state.t](state, uuid, client);
          if(client.entities[uuid].needsImage()){
            client.entities[uuid].createImage(client);
          }
          msg[uuid] = state;
        } else {
          if(client.entities[uuid].canEverMove()){
            delete client.entities[uuid];
          }
        }
      }

      if (Object.keys(msg).length) {
        // add entity to prediction worker
        /*
        worker.postMessage({
          'cmd': 'add',
          'msg': msg
        });
        */
      }
    });

    // listen for delta updates
    socket.on('state:delta', function(data) {

      // update server time (used for entity interpolation)
      time.server = data.time;
      time.client = time.server - core.offset;

      // update entities
      var entities = Object.keys(data.entities); // This is a list of uuids of the entities
      var length = entities.length;

      var uuid;
      var entity;
      var state;

      // update server state, interpolate foreign entities
      for (var i = 0; i < length; i++) {
        uuid = entities[i];
        entity = data.entities[uuid];

        if (entity && client.entities[uuid]) {
          // authoritatively set internal state if player exists on client
          client.entities[uuid].setPublic(entity);

          // get full snapshot for interpolation
          // queue server updates for entity interpolation
          client.entities[uuid].queue.server.push(client.entities[uuid].getState());

          // remove all updates older than one second from interpolation queue
          client.entities[uuid].queue.server = client.entities[uuid].queue.server.filter(core.filterQueue);
        } else if (entity) {
          // new Entities should send full state in first delta update
          // if defined on server but not on client, create new Entity on client
          state = entity;

          if (state.t && types[state.t]) {
            client.entities[uuid] = new types[state.t](state, uuid, client);
            if (client.entities[uuid].needsImage()) {
              client.entities[uuid].createImage(client);
            }
            // msg[uuid] = state;
          }

        }
      }

    });
  };

  // Read the URL and find a parameter by name.
  // @param [String] name The name of the parameter (i.e. ?name=value) from the URL.
  var getParameter = function(name){
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if(results == null)
      return "";
    else
      return decodeURIComponent(results[1].replace(/\+/g, " "));
  };

  var frame = function() {
    loop(this);

    // TODO: why does this occaisionally spike from 0.016 to 0.4?
    // doesn't seem to coincide with garbage collection steps
    // could possibly be some long blocking operation?
    /*
    if (time.delta > 0.2) {
      console.log(time.delta);
    }
    */
  };

  var loop = function(client) {
    var client = client || this;

    // this bind necessary because of scope change on successive calls
    client.animationFrame = window.requestAnimationFrame(frame.bind(client));

    time.setDelta();
    runFrameActions(client);
    stats.update();
  };

  var pause = function() {
    window.cancelAnimationFrame(this.animationFrame);
    this.areRunning = false;
  };

  var play = function() {
    if(!this.areRunning) {
      this.then = Date.now();

      // init animation loop, variable time step
      this.loop();

      this.areRunning = true;
    }
  };

  var runFrameActions = function(client) {
    for (var i = 0; i < client.actions.length; i++) {
      client.actions[i](client);
    }
  };

  var clearCanvas = function(client) {
    client.ctx.clearRect(0, 0, client.canvas.width, client.canvas.height);
  };

  var cameraHeight = function(){
     var footer_height = 64;
     var camara_height = window.innerHeight - footer_height;
     return camara_height;
  };

  var createCanvas = function() {
    var canvas = this.canvas = document.createElement('canvas');
    this.ctx = canvas.ctx = canvas.getContext('2d');
    this.setScale(canvas, window.innerWidth);

    var camera = this.camera = document.createElement('canvas');
    camera.ctx = camera.getContext('2d');
    this.setScale(camera, window.innerWidth, this.cameraHeight());

    // throttle to only change after resizing complete
    var resizeTimer;

    // resize canvas on window resize
    window.addEventListener('resize', (function(event) {
      var resize = (function() {
        clearTimeout(resizeTimer);

        var width = window.innerWidth;
        var height = this.cameraHeight();

        this.setScale(this.canvas, width);
        this.setScale(this.camera, width, height);

        this.updateCamera(this);
      }).bind(this);

      resizeTimer = setTimeout(resize, 100);
    }).bind(this));

    document.getElementById('main').appendChild(camera);
  };

  // Canvas should fit within the HUD UI
  var setScale = function(canvas, width, height) {
    // in Box2D meters
    var left_hud_width = 120;
    var right_hud_width = 120;
    var proposed_width = width - left_hud_width - right_hud_width
    canvas.scale = proposed_width / 48;
    canvas.width = proposed_width;
    canvas.height = height || 62 * canvas.scale;
  };

  var updateEntities = function(client) {
    var draw = {};

    var entities = Object.keys(client.entities);
    var length = entities.length;
    var uuid;
    var entity;

    for (var i = 0; i < length; i++) {
      uuid = entities[i];
      entity = client.entities[uuid];

      // TODO: switch to array of player-originated entities
      interpolate = (uuid !== client.uuid);

      if (interpolate) {

        // interpolate position of other entities
        entity.interpolate();

      } else {

        // TODO: switch this to reconcile
        entity.interpolate();

        // client prediction only for active player
        entity.respondToInput(input.pressed, function(input) {
          client.socket.emit('command:send', input);
        });

      }

    }
  };

  var drawEntities = function(client) {
    // only layers defined here will be drawn!
    var order = [
      'Background',
      'Platform',
      'Powerup',
      'Projectile',
      'Player'
    ];

    var orderLength = order.length;

    var entities = Object.keys(client.entities);
    var length = entities.length;

    var uuid;
    var entity;

    for (var i = 0; i < orderLength; i++) {
      for (var j = 0; j < length; j++) {
        uuid = entities[j];
        entity = client.entities[uuid];

        if (!entity.state.public.isDead && entity.shouldRenderAs(order[i])) {
          entity.draw(client.ctx, client.canvas.scale);
        }
      }
    }
  };

  var updateCamera = function(client) {
    // follow player with camera
    // TODO: parallax background, interpolated camera movement
    var ctx = client.camera.ctx;
    var canvas = client.canvas;

    var player = client.entities[client.uuid];
    var value;

    if (player) {
      value = Math.min(player.state.private.y * canvas.scale, canvas.height - (cameraHeight() / 2));
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.drawImage(canvas, 0, (cameraHeight() / 2) - value);
    }
  };

  var currentPlayer = function() {
    var player = this.entities[this.uuid];
    if (player) {
        return player;
    }
  };

  var updateUI = function(client) {
    // emit intoxication level event
    var player = client.entities[client.uuid];

    if (player) {
      var state = player.state.public;
      var hud = new CustomEvent('hud', {
        detail: {
          intoxication: state['intoxication']
        }
      });

      document.dispatchEvent(hud);
    }
  };

  var disconnect = function() {
    // console.log("Game over! Thanks for playing.");
    this.socket.disconnect();
  }

  return {
    actions: actions,
    entities: entities,
    getParameter: getParameter,
    init: init,
    loop: loop,
    pause: pause,
    play: play,
    runFrameActions: runFrameActions,
    clearCanvas: clearCanvas,
    createCanvas: createCanvas,
    setScale: setScale,
    updateEntities: updateEntities,
    drawEntities: drawEntities,
    updateCamera: updateCamera,
    cameraHeight: cameraHeight,
    currentPlayer: currentPlayer,
    disconnect: disconnect
  };

});
