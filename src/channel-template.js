var template = 
'<div class="channel-window">' +
'  {{#user.channels}}' +
'    <div class="channel-item" data-active="{{active}}" on-click="activate">' +
'      <span class="channel-item-name">{{name}}</span>' +
'    </div>' +
'  {{/user.channels}}' +
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
        e.context.activate(e);
      });
    }
  });
};
