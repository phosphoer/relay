var Log = require('./log');

module.exports = function(name, appModel)
{
  this.name = name || 'channel';
  this.logs = [];
  this.users = [];
  this.active = true;

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
    for (var i = 0; i < appModel.channels.length; ++i)
      appModel.channels[i].active = false;
    this.active = true;
    appModel.currentChannel = this;
    appModel.logUI.update();
    appModel.usersUI.update();
    appModel.channelsUI.update();
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