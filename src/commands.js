module.exports = function(appModel)
{
  var irc = require('irc');  
  var Log = require('./log.js');
  var _ = require('underscore');

  var commands = {};
  commands.connect = function(server, port)
  {
    try
    {
      appModel.addLog('app', "connecting...");

      appModel.client = new irc.Client(server, appModel.nick,
      {
        port: port || 6667,
        userName: 'relay'
      });

      appModel.setupListeners();
    }
    catch (e)
    {
      appModel.addLog('error', e.toString());
    }
    appModel.currentServer = server;
    appModel.currentPort = port || 6667;
  };

  commands.disconnect = function(message)
  {
    appModel.client.disconnect(message, function()
    {
      appModel.connected = false;
      appModel.resetChannels();
      appModel.addLog('app', 'disconnected');
    });
  };

  commands.message = function(to, text)
  {
    var messageParts = Array.prototype.slice.call(arguments, 1);
    var message = messageParts.join(' ');
    appModel.client.say(to, message);
  };

  commands.join = function(channel)
  {
    if (channel)
      appModel.client.join(channel);
    else
      appModel.addLog('error', 'Please specify a channel name');
  };

  commands.part = function(channel, message)
  {
    if (!channel)
      appModel.client.part(appModel.currentChannel.name, message);
    else
      appModel.client.part(channel, message);
  };

  commands.nick = function(nick)
  {
    if (nick)
    {
      appModel.client.send('NICK', nick);

      // We can change our nick with no confirmation in default channel
      if (appModel.currentChannel === appModel.channels[0])
      {
        appModel.nick = nick;
        appModel.addLog('app', 'Set nick to ' + nick);
        var save = appModel.getSave();
        save.nick = nick;
        appModel.setSave(save);
      }
    } 
    else
    {
      appModel.addLog('app', 'nick: ' + appModel.nick);
    }
  };

  commands.topic = function(topic)
  {
    var messageParts = Array.prototype.slice.call(arguments, 0);
    var message = messageParts.join(' ');
    appModel.client.send('TOPIC', appModel.currentChannel.name, message);
  };

  commands.clear = function()
  {
    appModel.currentChannel.clear();
  };

  commands.checkupdate = function()
  {
    appModel.addLog('app', 'Checking for updates');
    appModel.checkForUpdate();
  };

  commands.debug = function()
  {
    window.require('nw.gui').Window.get().showDevTools();
  };

  commands.reload = function()
  {
    window.require('nw.gui').Window.get().reload();
  };

  commands.help = function()
  {
    appModel.addLog('app', 'Commands');
    appModel.addLog('app', _.keys(commands).join(', '));
  }

  return commands;
}