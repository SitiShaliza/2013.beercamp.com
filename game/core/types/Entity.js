(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(factory);
  } else {
    // browser globals (root is window)
    root.GAME = root.GAME || {};
    root.GAME.Entity = factory(root.GAME || {});
  }
})(this, function(game) {

	var Entity = function(properties) {
    // public state for sync
    this.state = {};

		if(properties) {
			this.set(properties);
		}
	};

	Entity.prototype.set = function(properties){
		for(var property in properties) {
			this[property] = properties[property];
		}

		this.color = this.color || 'black';
		this.rotation = this.rotation || 0; // radians
		this.scale = this.scale || 1;
	};

	Entity.prototype.draw = function() {
    game.ctx.save();

    // Round to whole pixel
    var x = (this.x + 0.5) | 0;
    var y = (this.y + 0.5) | 0;

    // Apply Transformations (scale and rotate from center)
    game.ctx.translate(x + this.width / 2, y + this.height / 2);
    game.ctx.rotate(this.rotation);
    game.ctx.scale(this.scale, this.scale);
    game.ctx.translate(-this.width/2, -this.height/2);

    // Call extended Entity Type's draw method
    this.drawType && this.drawType();

    game.ctx.restore();
	};

  return Entity;

});
