(function(root, factory) {
  if (typeof exports === 'object') {
    // Node.js
    module.exports = factory(
      require('../core'),
      require('../time'),
      require('./Rectangle')
    );
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([
      '../core',
      '../time',
      './Rectangle'
    ], factory);
  }
})(this, function(core, time, Rectangle) {

	var Background = function(properties, id, client) {
    properties = properties || {};
    properties.class = properties.class || 'Background';
    
    Rectangle.call(this, properties, id, client);

    return this;
	};

	Background.prototype = new Rectangle();
    Background.prototype.constructor = Background;

    // Determines if this object can ever move during the game.
    // Subclasses can override to optimize message communication
    Background.prototype.canEverMove = function() {
        return false;
    };

    Background.prototype.drawType = function(ctx, scale) {
        // the following line will show pink lines, useful for debugging
        // Rectangle.prototype.drawType.call(this, ctx, scale);

        // round to whole pixel
        // interpolated x and y coords
        var x = (this.state.private.x * scale + 0.5) | 0;
        var y = (this.state.private.y * scale + 0.5) | 0;

        var width = ((this.state.private.width * scale) + 0.5) | 0;
        var height = ((this.state.private.height * scale) + 0.5) | 0;

        var halfWidth = ((this.state.private.width * scale / 2) + 0.5) | 0;
        var halfHeight = ((this.state.private.height * scale / 2) + 0.5) | 0;

        ctx.save();

        if (this.actor) {
          this.actor.draw(ctx, x - halfWidth, y - halfHeight, scale);
        }

        ctx.restore();
    }

    return Background;

});
