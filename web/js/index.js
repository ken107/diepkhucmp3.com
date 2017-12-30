
currentPage = "SEARCH";

playlist = new function() {
  this.items = [];
  this.selected = {};

  this.toggle = function(item) {
    if (this.selected[item.id]) {
      this.selected[item.id] = false;
      this.items.splice(this.items.indexOf(item), 1);
    }
    else {
      this.selected[item.id] = true;
      this.items.push(item);
    }
  }

  this.play = function(item) {
    console.log(item);
  }
}
