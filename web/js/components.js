
$("<div/>").load("components.html", function() {
  $(this).children().each(function() {
    var className = $(this).data("class");
    if (window[className]) dataBinder.views[className] = {template: this, controller: window[className]};
    else throw new Error("Class not found " + className);
  })
})
