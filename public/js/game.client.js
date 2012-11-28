window.GAME = window.GAME || {};

(function(game) {

	var client = game.client = {
		init: function() {
      var socket = game.socket = io.connect();

      socket.on('players', function(data) {
        console.log(data);
        game.scenes.level_1.players = data;
      });

      // set socket.uid before processing updates
      socket.on('uid', function(data) {
        socket.uid = data;

        socket.on('state:update', function(data) {
          // update server time
          game.time.server = data.time;
          game.time.client = game.time.server - game.offset;

          var players = Object.keys(data.players);
          var length = players.length;

          var uid;
          var player;
          var client;

          // update server state, interpolate foreign entities
          if (length) {

            // TODO: draw ships on stage for each player
            for (var i = 0; i < length; i++) {
              uid = players[i];
              player = data.players[uid];

              // authoritatively set internal state if player exists on client
              client = game.scenes.level_1;

              if (client) {
                // update last acknowledged input
                if (data.ack) {
                  client.ship.ack = data.ack;
                }

                client.ship.sx = parseInt(player.ship.x);
                client.ship.sy = parseInt(player.ship.y);

                // reconcile client prediction with server
                if (uid === socket.uid) {
                  client.ship.reconcile();
                } else {
                  // queue server updates for entity interpolation
                  game.queue.server.push(player);
                }
              }
            }
            
            // splice array, keeping BUFFER_SIZE most recent items
            if (game.queue.server.length >= game.buffersize) {
              game.queue.server.splice(-game.buffersize);
            }
          }
        });
      });

      // pause on blur doesnt make sense in multiplayer
      /*
			window.addEventListener('blur', client.pause, false);
			window.addEventListener('focus', client.play, false);
      */
		},

		loop: function() {
			client.animationFrame = window.requestAnimationFrame(client.loop);
			client.setDelta();

      // defined in scene
			client.runFrameActions();
		},

		pause: function() {
			window.cancelAnimationFrame(client.animationFrame);
			client.areRunning = false;
		},

		play: function() {
			if(!client.areRunning) {
				client.then = Date.now();

        // init animation loop, variable time step
				client.loop();

				client.areRunning = true;
			}
		},

		runFrameActions: function() {
			for (var i = 0; i < client.actions.length; i++) {
				client.actions[i]();
			}
		},

		setDelta: function() {
			client.now = Date.now();
			client.delta = (client.now - client.then) / 1000; // seconds since last frame
			client.then = client.now;
		}
	};

})(window.GAME);