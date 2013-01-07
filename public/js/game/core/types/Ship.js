(function(e,t){typeof exports=="object"?module.exports=t(require("../core"),require("../time"),require("../../client/input"),require("./Entity"),require("./Missile"),undefined,require("node-uuid")):typeof define=="function"&&define.amd&&define(["../core","../time","../../client/input","./Entity","./Missile","./Image"],t)})(this,function(e,t,n,r,i,s,o){var u=function(e){this.uuid=o?o.v4():!1,this.set(e),this.setDefaults(),this.loadMissiles(),this.queue={},this.queue.server=[],this.server={}};return u.prototype=new r,u.prototype.setDefaults=function(){this.fireButtonReleased=!0,this.image=s?new s("images/ship.png"):!1,this.missiles=[],this.now=0,this.then=0,this.height=50,this.width=50;var e={x:20,y:380,vx:0,speed:this.speed||300,maxMissiles:this.maxMissiles||3,repeatRate:this.repeatRate||30};this.set(e)},u.prototype.respondToInput=function(n,r){var i=e.getVelocity(r),s=!1,o;this.vx=parseInt(this.speed*t.delta*i.dx),r.spacebar?this.fire():(this.fireButtonReleased||(s=!0),this.fireButtonReleased=!0);if(this.vx||r.spacebar||s)o={time:Date.now(),seq:n.seq++,input:r,data:{speed:this.speed,vector:i}},n.queue.input.push(o),n.socket.emit("command:send",o)},u.prototype.move=function(){this.sx?(this.sx+=this.vx,this.queue.server.push(this),this.queue.server.length>=e.buffersize&&this.queue.server.splice(0,this.queue.server.length-e.buffersize)):this.x+=this.vx},u.prototype.reconcile=function(e,n){var r=0,i=0,s=e.queue.input=e.queue.input.filter(function(e,n,r){return e.seq==this.ack&&(t.latency=(Date.now()-e.time)/1e3),e.seq>this.ack}.bind(this));for(var o=0;o<s.length;o++)r+=parseInt(s[o].data.speed*s[o].data.vector.dx*t.delta);this.sx=parseInt(n.ship.state.x)+r},u.prototype.interpolate=function(){var n=Math.abs(this.sx-this.x);if(!this.queue.server.length)return;if(n<.1||n>200){this.x=this.sx;return}var r,i,s,o,u=this.queue.server.length-1,a,f;for(var l=0;l<u;l++){a=this.queue.server[l],f=this.queue.server[l+1];if(t.client>a.time&&t.client<f.time){s=a,o=f;break}}s||(s=o=this.queue.server[this.queue.server.length-1]);var c=0;if(s.time!==o.time){var n=s.time-t.client,h=s.time-o.time;c=n/h}r=e.lerp(o.sx,s.sx,c),this.x=e.lerp(this.x,r,t.delta*e.smoothing)},u.prototype.loadMissiles=function(){var e=0;while(e<this.maxMissiles)this.missiles.push(new i(this)),e++},u.prototype.fire=function(e,n){this.now=t.now;var r=(this.now-this.then)/1e3,i=Object.keys(this.missiles),s=i.length,o,u=[],a;for(var f=0;f<s;f++)o=i[f],a=this.missiles[o],a.isLive||u.push(a);var l=u.length>0,c=r>1/this.repeatRate,h=c&&l&&this.fireButtonReleased;h&&(this.fireButtonReleased=!1,u[0].fire(e,n),this.then=this.now)},u.prototype.drawType=function(t){e.debug&&(t.ctx.fillStyle="rgba(0, 0, 255, 0.25)",t.ctx.fillRect(0,0,this.width,this.height),t.ctx.fill()),this.image.draw(t)},u.prototype.die=function(){console.log("die!")},u.prototype.getState=function(){var e=[];for(var t=0;t<this.missiles.length;t++)e.push(this.missiles[t].getState());return{uuid:this.uuid,state:this.state,missiles:e}},u});