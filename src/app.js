var Channel = require('./channel');
var Log = require('./log');
var irc = require('irc');

var App = function(Ractive)
{
  this.nick = this.getSave().nick || 'relay_user';
  this.channels = [new Channel('default', this)];
  this.defaultChannel = this.channels[0];
  this.currentChannel = this.defaultChannel;
  this.client = new irc.Client('', 'unnamed-user');
  this.connected = false;
  this.channelsUI = null;
  this.usersUI = null;
  this.logUI = null;
  this.commands = require('./commands')(this);
  this.events = require('./events')(this);
  this.commandHistory = [];
  this.currentHistoryIndex = 0;
  this.Ractive = Ractive;
};

App.prototype.initialize = function()
{
  var that = this;
  // Build channels window
  this.channelsUI = new this.Ractive(
  {
    el: 'channelContainer',
    template: '#channelsTemplate',
    data:
    {
      user: this
    }
  });
  this.channelsUI.on('activate', function(e)
  {
    e.context.activate();
  });

  // Build user window
  this.usersUI = new this.Ractive(
  {
    el: 'usersContainer',
    template: '#usersTemplate',
    data:
    {
      user: this
    }
  });

  // Build log window
  this.logUI = new this.Ractive(
  {
    el: 'logContainer',
    template: '#logTemplate',
    data:
    {
      user: this
    }
  });
  this.logUI.on('activate', function(e)
  {
    e.context.activate(e);
  });

  // Default message
  this.addLog('app', 'Welcome to Relay!');

  // Show recent servers
  var save = this.getSave();
  if (save.servers)
  {
    this.addLog('app', 'Recent servers...');
    for (var i in save.servers)
    {
      this.addLog('app', i + ':' + save.servers[i]);

      // Force log to be an IRC link
      this.channels[0].logs[this.channels[0].logs.length - 1].isIrcLink = true;
      this.channels[0].logs[this.channels[0].logs.length - 1].ircLink = i;
    }
  }

  // Handle enter press on input
  var input = window.document.querySelector('.user-input');
  input.addEventListener('keydown', function(e)
  {
    // Hit enter on the keyboard
    if (e.keyCode === 13)
    {
      var command = input.value;
      input.value = '';

      // Try parsing input as a command, otherwise send it as a
      // message
      if (!that.parseCommand(command))
        that.sendMessage(command);
    }
  });

  // Handle up arrow press
  window.addEventListener('keydown', function(e)
  {
    if (e.keyCode === 38)
    {
      
    }
  });
};

App.prototype.sendMessage = function(message)
{
  this.addLog(this.nick, message);
  this.commands.message(this.currentChannel.name, message);
};

App.prototype.parseCommand = function(message)
{
  if (message[0] !== '/' && message[0] !== '\\')
    return false;

  var parts = message.split(' ');
  var command = parts[0].slice(1);
  var args = parts.slice(1);

  if (command in this.commands)
  {
    this.commands[command].apply(this.commands, args);
  }
  else
  {
    this.addLog('x', message);
  }

  return true;
};

App.prototype.setupListeners = function()
{
  for (var i in this.events)
    this.client.addListener(i, this.events[i]);
};

App.prototype.resetChannels = function()
{
  this.channels = [this.defaultChannel];
  this.currentChannel = this.channels[0];
  this.channelsUI.update();
  this.logUI.update();
  this.usersUI.update();
};

App.prototype.getChannel = function(name)
{
  for (var i = 0; i < this.channels.length; ++i)
    if (this.channels[i].name === name)
      return this.channels[i];
};

App.prototype.addLog = function(sender, message)
{
  this.currentChannel.addLog(sender, message);
  var logWin = window.document.querySelector('.log-window');
  logWin.scrollTop = logWin.scrollHeight;    
};

App.prototype.getSave = function()
{
  if (!window.localStorage['relay-save'])
    window.localStorage['relay-save'] = JSON.stringify({});
  return JSON.parse(window.localStorage['relay-save']);
};

App.prototype.setSave = function(save)
{
  window.localStorage['relay-save'] = JSON.stringify(save);
};

module.exports = App;
