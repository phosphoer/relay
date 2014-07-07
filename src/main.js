var logs = [];
var irc = require('irc');
var client = new irc.Client('', 'unnamed-user');

var clientInfo =
{
  nick: 'default-nick',
  userName: 'unnamed-user',
  channels: [],
  currentChannel: null
};

function main()
{
  // Build log window
  var logUI = new Ractive(
  {
    el: 'logContainer',
    template: '#logTemplate',
    data: {logs: logs}
  });

  logs.push({sender: 'app', message: 'Hello world'});

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
  logs.push({sender: 'user', message: message});
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
    logs.push({sender: '>', message: message});

  return true;
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
  logs.push({sender: 'server', message: "connected"});
};

messages.motd = function(motd)
{
  logs.push({sender: 'server', message: motd});
};

messages.names = function(channel, nicks)
{

};

messages.message = function(from, to, text)
{
  logs.push({sender: from + ' > ' + to, message: text});
};

messages.pm = function(from, message)
{
};

//
// Commands
//
var commands = {};
commands.connect = function(server, port)
{
  client = new irc.Client(server, clientInfo.nick);
  setupListeners();
  client.connect();
};

commands.join = function(channel)
{
  client.join(channel);
};

commands.part = function(channel, message)
{
};