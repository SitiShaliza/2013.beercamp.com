var player = (function(game) {

  // constructor
	game.Player = function(player) {
		this.ship = new game.Ship({
      speed: 300,
      maxMissiles: 3,
      repeatRate: 30
    });

    // init from existing state
    if (player) {
      this.ship.x = player.ship.x;
    }
	};

	game.Player.prototype = new game.Object();

  return game;
});

// export module or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = player;
} else {
  player(window.GAME || {});
}
