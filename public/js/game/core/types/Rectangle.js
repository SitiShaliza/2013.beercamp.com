(function(e,t){typeof exports=="object"?module.exports=t(require("./Entity")):typeof define=="function"&&define.amd&&define(["./Entity"],t)})(this,function(e){var t=function(e){e&&this.set(e)};return t.prototype=new e,t.prototype.drawType=function(e){e.ctx.fillStyle=this.color,e.ctx.fillRect(0,0,this.width,this.height),e.ctx.fill()},t});