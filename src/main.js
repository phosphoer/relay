process.on("uncaughtException", function(e) { });

var gui = window.require('nw.gui');
var App = window.require('./app.js');

function main()
{
  var appModel = new App(Ractive);
  appModel.initialize();

  // Handle opening links in a new browser
  var win = gui.Window.get();
  win.on('new-win-policy', function(frame, url, policy)
  {
    if (url.indexOf('http') >= 0)
    {
      policy.ignore();
      gui.Shell.openExternal(url);
    }
  });

  // Handle closing the window
  win.on('close', function()
  {
    appModel.client.disconnect('quit');
    this.close(true);
  });
}
