var Log = require('./log');

module.exports = function(name, appModel)
{
  this.name = name || 'channel';
  this.logs = [];
  this.users = [];
  this.active = false;

  this.scrollLatest = function()
  {
    if (appModel.currentChannel === this)
    {
      var logWin = window.document.querySelector('.log-window');
      logWin.scrollTop = logWin.scrollHeight;
    }
  }

  this.addLog = function(sender, message)
  {
    this.logs.push(new Log(appModel, sender, message));
    this.scrollLatest();
  };

  this.activate = function()
  {
    appModel.currentChannel = this;
    appModel.logUI.update();
    appModel.usersUI.update();
    this.scrollLatest();
  };

  this.clear = function()
  {
    appModel.currentChannel.logs = [];
    appModel.logUI.update();
  }

  this.getUser = function(name)
  {
    for (var i = 0; i < this.users.length; ++i)
      if (this.users[i].name === name)
        return this.users[i];
  };
};