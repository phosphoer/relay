var Log = require('./log');

module.exports = function(name, appModel)
{
  this.name = name || 'channel';
  this.logs = [];
  this.users = [];
  this.active = false;

  this.addLog = function(sender, message)
  {
    this.logs.push(new Log(appModel, sender, message));
  };

  this.activate = function()
  {
    appModel.currentChannel = this;
    appModel.logUI.update();
    appModel.usersUI.update();
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