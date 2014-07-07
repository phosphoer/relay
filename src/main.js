var irc = require('irc');
var client = new irc.Client('', 'unnamed-user');

var Log = function(sender, message)
{
  this.sender = sender || 'no one';
  this.message = message || 'nooothinnnggg';
};

var Channel = function(name)
{
  this.name = name || 'channel';
  this.logs = [];

  this.activate = function()
  {
    clientInfo.currentChannel = this;
    logUI.update();
  };
};

var defaultChannel = new Channel('default');

var clientInfo =
{
  nick: 'relay-user-1',
  userName: 'unnamed-user',
  channels: [defaultChannel],
  currentChannel: defaultChannel
};

var channelsUI = null;
var logUI = null;

function main()
{
  // Build channels window
  channelsUI = new Ractive(
  {
    el: 'channelContainer',
    template: '#channelsTemplate',
    data: {user: clientInfo}
  });
  channelsUI.on('activate', function(e)
  {
    e.context.activate();
  });

  // Build log window
  logUI = new Ractive(
  {
    el: 'logContainer',
    template: '#logTemplate',
    data: {user: clientInfo}
  });

  // Default message
  defaultChannel.logs.push(new Log('app', 'Welcome to Relay!'));

  var input = document.querySelector('.user-input');
  input.addEventListener('keydown', function(e)
  {
    // Hit enter on the keyboard
    if (e.keyCode === 13)
    {
      var command = input.value;
      input.value = '';

      // Try parsing input as a command, otherwise send it as a
      // message
      if (!parseCommand(command))
        sendMessage(command);
    }
  });
}

function sendMessage(message)
{
  clientInfo.currentChannel.logs.push(new Log(clientInfo.nick, message));
  commands.message(clientInfo.currentChannel.name, message);
}

function parseCommand(message)
{
  if (message[0] !== '/')
    return false;

  var isCommand = true;
  var parts = message.split(' ');
  var command = parts[0].slice(1);
  var args = parts.slice(1);

  if (command in commands)
  {
    commands[command].apply(commands, args);
  }
  else
  {
    isCommand = false;
  }

  if (isCommand)
    clientInfo.currentChannel.logs.push(new Log('>', message));

  return isCommand;
}

function setupListeners()
{
  for (var i in messages)
    client.addListener(i, messages[i]);
}

//
// Messages
//
var messages = {};
messages.registered = function()
{
  var log = new Log('server', 'connected');
  clientInfo.currentChannel.logs.push(log);
};

messages.motd = function(motd)
{
  var log = new Log('server', motd);
  clientInfo.currentChannel.logs.push(log);
};

messages.names = function(channel, nicks)
{

};

messages.message = function(from, to, text)
{
  var log = new Log(from + ' > ' + to, text);
  if (to === clientInfo.currentChannel.name)
    log = new Log(from, text);
  clientInfo.currentChannel.logs.push(log);
};

messages.join = function(channel, nick)
{
  var log = new Log('server', nick + ' has joined ' + channel);
  clientInfo.currentChannel.logs.push(log);

  if (nick === clientInfo.nick)
  {
    var chan = new Channel(channel);
    clientInfo.channels.push(chan);
    clientInfo.currentChannel = chan;
    logUI.update();
  }
};

messages.part = function(channel, nick, reason)
{
  var log = new Log('server', nick + ' has left ' + channel + ' (' + reason + ')');
  clientInfo.currentChannel.logs.push(log);

  if (nick === clientInfo.nick)
  {
    for (var i = 0; i < clientInfo.channels.length; ++i)
    {
      if (clientInfo.channels[i].name === channel)
      {
        clientInfo.channels.splice(i, 1);
        clientInfo.currentChannel = clientInfo.channels[i] || clientInfo.channels[i - 1];
        logUI.update();
        break;
      }
    }
  }
};

messages.pm = function(from, text)
{
};

messages.error = function(message)
{
  console.log('error: ' + JSON.stringify(message));
};

//
// Commands
//
var commands = {};
commands.connect = function(server, port)
{
  client = new irc.Client(server, clientInfo.nick);
  setupListeners();
};

commands.message = function(to, text)
{
  client.say(to, text);
};

commands.join = function(channel)
{
  client.join(channel);
};

commands.part = function(channel, message)
{
  if (!channel)
    client.part(clientInfo.currentChannel.name, message);
  else
    client.part(channel, message);
};