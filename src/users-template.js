var template = 
'<div class="users-window">' +
'  {{#user.currentChannel.users}}' +
'    <div class="users-item" on-click="activate">' +
'      <span class="users-item-name">{{name}}</span>' +
'    </div>' +
'  {{/user.currentChannel.users}}' +
'</div>';

module.exports = function(Ractive)
{
  return Ractive.extend(
  {
    template: template,
    magic: true,
    init: function()
    {
      this.on('activate', function(e)
      {
        e.context.activate();
      });
    }
  });
};