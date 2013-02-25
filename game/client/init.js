(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['../core/core', 'input', 'client'], factory);
  }
})(this, function(core, input, client) {

  // game.debug = true;
  core.initGlobalVariables();
  input.init();
  client.createCanvas();
  client.init(client);
  client.play();

});
