
currentPage = "SEARCH";

playlist = new function() {
  this.items = [];
  this.ids = {};
  this.activeItem = null;

  this.toggle = function(item) {
    if (this.ids[item.id]) this.remove(item);
    else this.add(item);
  }
  this.remove = function(item) {
    if (this.ids[item.id]) {
      this.ids[item.id] = false;
      this.items.splice(this.items.indexOf(item), 1);
    }
  }
  this.add = function(item) {
    if (!this.ids[item.id]) {
      this.ids[item.id] = true;
      this.items.push(item);
    }
  }
  this.play = function(item) {
    this.activeItem = item;
  }
}

window.oncontextmenu = function(event) {
     event.preventDefault();
     event.stopPropagation();
     return false;
};
