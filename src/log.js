module.exports = function(sender, message)
{
  this.sender = sender || 'no one';
  this.message = message || 'nooothinnnggg';
  this.imgSrc = '';
  this.imgDisplay = 'none';
  this.linkHref = '';
  this.linkDisplay = 'none';
  this.ircLink = '';
  this.isIrcLink = false;
  this.type = '';
  this.from = '';
  
  // Detect a message with a link
  var match = message.match(/((http:.+)|(https:.+))/);
  if (match && match.index >= 0)
  {
    var url = match[1];

    if (/(.png|.gif|.jpg|.jpeg)$/.test(url))
    {
      this.imgSrc = url;
      this.linkHref = url;
      this.imgDisplay = '';
      this.message = this.message.replace(url, '');
    }
    else
    {
      this.linkHref = url;
      this.linkDisplay = '';
      this.message = this.message.replace(url, '');
    }
  }

  // Detect a message with an irc server link
  match = message.match(/(irc.+)/);
  if (match && match.index >= 0)
  {
    var url = match[1];
    this.ircLink = url;
    this.isIrcLink = true;
  }

  this.activate = function(e)
  {
    // Handle right clicking an image to hide it
    if (e.original.button === 2 && this.imgSrc)
    {
      this.imgDisplay = 'none';
      this.linkDisplay = '';
      logUI.update();
    }

    // Handle clicking a suggested IRC server link
    if (!clientInfo.connected && this.isIrcLink)
    {
      if (e.original.button === 2)
      {
        var save = getSave();
        delete save.servers[this.message];
        setSave(save);
        clientInfo.currentChannel.logs.splice(clientInfo.currentChannel.logs.indexOf(this), 1);
      }
      else
      {
        var port = getSave().servers[this.ircLink];
        commands.connect(this.ircLink, +port);
      }
    }
  };
};
