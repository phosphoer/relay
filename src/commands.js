module.exports = function(clientInfo, logUI, usersUI, channelsUI)
{
  var irc = require('irc');  
  var Log = require('./log.js');
  var _ = require('underscore');

  function getSave()
  {
    if (!window.localStorage['relay-save'])
      window.localStorage['relay-save'] = JSON.stringify(
      {});
    return JSON.parse(window.localStorage['relay-save']);
  }

  function setSave(save)
  {
    window.localStorage['relay-save'] = JSON.stringify(save);
  }

  var commands = {};
  commands.connect = function(server, port)
  {
    try
    {
      clientInfo.client = new irc.Client(server, clientInfo.nick,
      {
        port: port || 6667
      });

      clientInfo.setupListeners();
    }
    catch (e)
    {
      clientInfo.addLog('error', e.toString());
    }
    clientInfo.currentServer = server;
    clientInfo.currentPort = port || 6667;
  };

  commands.disconnect = function(message)
  {
    clientInfo.client.disconnect(message, function()
    {
      clientInfo.resetChannels();
      logUI.update();
      usersUI.update();
      clientInfo.addLog('app', 'disconnected');
    });
  };

  commands.message = function(to, text)
  {
    clientInfo.client.say(to, text);
  };

  commands.join = function(channel)
  {
    clientInfo.client.join(channel);
  };

  commands.part = function(channel, message)
  {
    if (!channel)
      clientInfo.client.part(clientInfo.currentChannel.name, message);
    else
      clientInfo.client.part(channel, message);
  };

  commands.nick = function(nick)
  {
    if (nick)
    {
      clientInfo.client.send('NICK', nick);

      // We can change our nick with no confirmation in default channel
      if (clientInfo.currentChannel === clientInfo.channels[0])
      {
        clientInfo.nick = nick;
        clientInfo.addLog('app', 'Set nick to ' + nick);
        var save = getSave();
        save.nick = nick;
        setSave(save);
      }
    } 
    else
    {
      clientInfo.addLog('app', 'Nick: ' + clientInfo.nick);
    }
  };

  commands.clear = function()
  {
    clientInfo.currentChannel.clear();
  };

  commands.help = function()
  {
    clientInfo.addLog('app', 'Commands');
    clientInfo.addLog('app', _.keys(commands).join(', '));
  }

  return commands;
}