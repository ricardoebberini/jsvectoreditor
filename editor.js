function bind(fn, scope){
  return function(){return fn.apply(scope, array(arguments))}
}

function array(a){
  for(var b=a.length,c=[];b--;)c.push(a[b]);
  return c;
}

function VectorEditor(elem, width, height){
    if (typeof(Raphael) != "function") { //check for the renderer
        return alert("Error! No Vector Graphics Library Found!"); //if renderer isn't there, return false;
    }
    
    this.draw = Raphael(elem, width, height);
    
    this.onHitXY = [0,0]
    this.offsetXY = [0,0]
    this.tmpXY = [0,0]
    
    this.fill = "#f00"; //red
    this.stroke = "#000"; //black
    
    this.mode = "select";
    this.selectbox = null;
    this.selected = []
    
    this.action = "";
    
    this.selectadd = false;
    
    this.shapes = []
    this.trackers = []
    
    this.draw.canvas.onmousedown = bind(this.onMouseDown, this);
    this.draw.canvas.onmousemove = bind(this.onMouseMove, this);
    this.draw.canvas.onmouseup = bind(this.onMouseUp, this);
    this.draw.canvas.ondblclick = bind(this.onDblClick, this);
}

VectorEditor.prototype.setMode = function(mode){
  if(mode == "select+"){
    this.mode = "select";
    this.selectadd = true;
    this.unselect()
  }else if(mode == "select"){
    this.mode = mode;
    this.unselect()
    this.selectadd = false;
  }else if(mode == "delete"){
    for(var i = 0; i < this.selected.length; i++){
      this.deleteShape(this.selected[i])
    }
    this.selected = [];
  }else{
    this.unselect()
    this.mode = mode;
  }
}

VectorEditor.prototype.unselect = function(shape){
  if(!shape){
    this.selected = [];
    this.removeTracker();
  }else{
    this.array_remove(shape, this.selected);
    for(var i = 0; i < this.trackers.length; i++){
      if(this.trackers[i].shape == shape){
        this.removeTracker(this.trackers[i]);
      }
    }
  }
}

//from the vXJS JS Library
VectorEditor.prototype.in_array = function(v,a){
  for(var i=a.length;i--&&a[i]!=v;);
  return i
}

//from vX JS, is it at all strange that I'm using my own work?
VectorEditor.prototype.array_remove = function(e, o){
  var x=this.in_array(e,o);
  x!=-1?o.splice(x,1):0
}

VectorEditor.prototype.is_selected = function(shape){
  return this.in_array(shape, this.selected) != -1;
}

VectorEditor.prototype.removeTracker = function(tracker){
  if(!tracker){
    for(var i = 0; i < this.trackers.length; i++){
      this.removeTracker(this.trackers[i]);
    }
    this.trackers = []
  }else{
    try {
      tracker.remove();
    }catch(err){}
  }
}

VectorEditor.prototype.moveTracker = function(x, y){
  for(var i = 0; i < this.trackers.length; i++){
    var el = this.trackers[i]
    for(var k = 0; k < el.length; k++){
      var box = el[k].getBBox()
      el[k].attr("x", box.x + x);
      el[k].attr("y", box.y + y);
    }
  }
}

VectorEditor.prototype.selectAdd = function(shape){
  if(this.is_selected(shape) == false){
    this.selected.push(shape)
    this.showGroupTracker(shape)
  }
}

VectorEditor.prototype.selectToggle = function(shape){
  if(this.is_selected(shape) == false){
    this.selected.push(shape)
    this.showGroupTracker(shape)
  }else{
    this.unselect(shape)
  }
}

VectorEditor.prototype.select = function(shape){
  this.unselect()
  this.selected = [shape]
  this.showTracker(shape)
}

VectorEditor.prototype.resize = function(object, width, height, x, y){
  if(object.type == "rect" || object.type == "image"){
    if(width > 0){
      object.attr("width", width)
    }else{
      object.attr("x", (x?x:object.attr("x"))+width)
      object.attr("width", Math.abs(width)) 
    }
    if(height > 0){
      object.attr("height", height)
    }else{
      object.attr("y", (y?y:object.attr("y"))+height)
      object.attr("height", Math.abs(height)) 
    }
  }else if(object.type == "ellipse"){
    if(width > 0){
      object.attr("rx", width)
    }else{
      object.attr("x", (x?x:object.attr("x"))+width)
      object.attr("rx", Math.abs(width)) 
    }
    if(height > 0){
      object.attr("ry", height)
    }else{
      object.attr("y", (y?y:object.attr("y"))+height)
      object.attr("ry", Math.abs(height)) 
    }
  }
}

VectorEditor.prototype.onMouseDown = function(event){
  var x = event.clientX,
      y = event.clientY,
      target = event.target
      
  this.tmpXY = this.onHitXY = [x,y]
  
  if(this.mode == "select" && !this.selectbox){
    if(target == this.draw.canvas){
      if(!this.selectadd) this.unselect();
      this.selectbox = this.draw.rect(x, y, 0, 0)
        .attr({"fill-opacity": 0.15, 
              "stroke-opacity": 0.5, 
              "fill": "#007fff",
              "stroke": "#007fff"});
    }else if(target.shape_object){
      if(this.selected.length > 1 || this.selectadd){
        this.selectAdd(target.shape_object);
        this.action = "move";
      }else{
        this.select(target.shape_object);
        this.action = "move";
      }
      this.offsetXY = [target.shape_object.attr("x") - x,target.shape_object.attr("y") - y]
    }
  }else if(this.selected.length == 0){
    var shape = null;
    if(this.mode == "rect"){
      shape = this.draw.rect(x, y, 0, 0);
    }else if(this.mode == "ellipse"){
      shape = this.draw.ellipse(x, y, 0, 0);
    }else if(this.mode == "path"){
      shape = this.draw.path({}).moveTo(x, y)
    }else if(this.mode == "line"){
      shape = this.draw.path({}).moveTo(x, y)
      shape.subtype = "line"
    }else if(this.mode == "polygon"){
      shape = this.draw.path({}).moveTo(x, y)
      shape.subtype = "polygon"
    }else if(this.mode == "image"){
      shape = this.draw.image("http://upload.wikimedia.org/wikipedia/commons/a/a5/ComplexSinInATimeAxe.gif", x, y, 0, 0);
    }else if(this.mode == "text"){
    }
    if(shape){
      shape.id = this.generateUUID();
      shape.attr({fill: this.fill, stroke: this.stroke})
      this.addShape(shape)
    }
  }else{
    if(this.mode == "polygon"){
        this.selected[0].lineTo(x, y)
    }
  }
}

VectorEditor.prototype.addShape = function(shape){
  shape.node.shape_object = shape
  this.selected = [shape]
  this.shapes.push(shape)
}

VectorEditor.prototype.rectsIntersect = function(r1, r2) {
  return r2.x < (r1.x+r1.width) && 
          (r2.x+r2.width) > r1.x &&
          r2.y < (r1.y+r1.height) &&
          (r2.y+r2.height) > r1.y;
}

VectorEditor.prototype.drawGrid = function(){
  this.draw.drawGrid(0, 0, 480, 272, 10, 10, "blue").toBack()
}

VectorEditor.prototype.move = function(shape, x, y){
  shape.translate(x,y)
  //if(shape.type == "rect" || shape.type == "image"){
  //  shape.attr('x', shape.attr('x') + x)
  //  shape.attr('y', shape.attr('y') + y)
  //}else if(shape.type == "ellipse"){
  //  shape.attr('rx', shape.attr('rx') + x)
  //  shape.attr('ry', shape.attr('ry') + y)
  //}
}

VectorEditor.prototype.onMouseMove = function(event){
  var x = event.clientX,
      y = event.clientY;
      
  if(this.mode == "select"){
    if(this.selectbox){
      this.resize(this.selectbox, x - this.onHitXY[0], y - this.onHitXY[1], this.onHitXY[0], this.onHitXY[1])
    }else{
      if(this.action == "move"){
        for(var i = 0; i < this.selected.length; i++){
          this.move(this.selected[i], x - this.tmpXY[0], y - this.tmpXY[1])
        }
        this.moveTracker(x - this.tmpXY[0], y - this.tmpXY[1])
        this.tmpXY = [x, y]
      }
    }
  }else if(this.selected.length == 1){
    if(this.mode == "rect"){
      this.resize(this.selected[0], x - this.onHitXY[0], y - this.onHitXY[1], this.onHitXY[0], this.onHitXY[1])
    }else if(this.mode == "image"){
      this.resize(this.selected[0], x - this.onHitXY[0], y - this.onHitXY[1], this.onHitXY[0], this.onHitXY[1])
    }else if(this.mode == "ellipse"){
      this.resize(this.selected[0], x - this.onHitXY[0], y - this.onHitXY[1], this.onHitXY[0], this.onHitXY[1])
    }else if(this.mode == "path"){
      this.selected[0].lineTo(x, y);
    }else if(this.mode == "polygon" || this.mode == "line"){
      //this.selected[0].path[this.selected[0].path.length - 1].arg[0] = x
      //this.selected[0].path[this.selected[0].path.length - 1].arg[1] = y
      //this.selected[0].redraw();
      var pathsplit = this.selected[0].attr("path").split(" ");
      if(pathsplit.length > 3){
        var hack = pathsplit.reverse().slice(3).reverse().join(" ")+' '
        //its such a pity that raphael has lost the ability to do it without hacks -_-
        this.selected[0].attr("path", hack)
      }
      this.selected[0].lineTo(x, y)
    }
  }
  
}

VectorEditor.prototype.trackerBox = function(x, y){
  var w = 4
  return this.draw.rect(x - w, y - w, 2*w, 2*w).attr({
    "stroke-width": 1,
    "stroke": "green",
    "fill": "white"
  }).mouseover(function(){
    this.attr("fill", "red")
  }).mouseout(function(){
    this.attr("fill", "white")
  })
}

VectorEditor.prototype.generateUUID = function(){
  var uuid = ""
  for(var i = 0; i < 32; i++){
    uuid += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(Math.random()*26))
  }
  return uuid;
}


VectorEditor.prototype.getMarkup = function(){
    return this.draw.canvas.parentNode.innerHTML;
}


VectorEditor.prototype.showTracker = function(shape){
  if(shape.subtype == "line"){
    var line = Raphael.parsePathString(shape.attr('path'));
    var tracker = this.draw.set();
    tracker.shape = shape;
    tracker.push(this.trackerBox(line[0][1],line[0][2]))
    tracker.push(this.trackerBox(line[1][1],line[1][2]))
    
    this.trackers.push(tracker)
  }else if(shape.type == "rect" || shape.type == "image"){
    var tracker = this.draw.set();
    var box = shape.getBBox();
    tracker.shape = shape;
    tracker.push(this.draw.rect(box.x - 10, box.y - 10, box.width + 20, box.height + 20).attr({"opacity":0.3}))
    tracker.push(this.trackerBox(box.x - 10, box.y - 10))
    tracker.push(this.trackerBox(box.x + box.width + 10, box.y - 10))
    tracker.push(this.trackerBox(box.x + box.width + 10, box.y + box.height + 10))
    tracker.push(this.trackerBox(box.x - 10, box.y + box.height + 10))
    
    this.trackers.push(tracker)
  }else if(shape.type == "ellipse"){
    var tracker = this.draw.set();
    var box = shape.getBBox();
    tracker.shape = shape;
    tracker.push(this.trackerBox(box.x, box.y))
    tracker.push(this.trackerBox(box.x + box.width, box.y))
    tracker.push(this.trackerBox(box.x + box.width, box.y + box.height))
    tracker.push(this.trackerBox(box.x, box.y + box.height))
    
    this.trackers.push(tracker)
  }
}



VectorEditor.prototype.showGroupTracker = function(shape){
  var tracker = this.draw.set();
  var box = shape.getBBox();
  tracker.push(this.draw.rect(box.x - 5, box.y - 5, box.width + 10, box.height + 10).attr({
    "stroke-dasharray": "-",
    "stroke": "blue"
  }))
  tracker.shape = shape;
  this.trackers.push(tracker)
}

VectorEditor.prototype.onDblClick = function(event){
  if(this.mode == "polygon" && this.selected.length == 1){
    this.selected[0].andClose()
    this.selected = [];
  }
}

VectorEditor.prototype.deleteShape = function(shape){
  if(shape && shape.node && shape.node.parentNode){
    shape.remove()
  }
  for(var i = 0; i < this.trackers.length; i++){
    if(this.trackers[i].shape == shape){
      this.removeTracker(this.trackers[i]);
    }
  }
  //should remove references, but whatever
}

VectorEditor.prototype.onMouseUp = function(event){
  var target = event.target
  if(this.mode == "select"){
    if(this.selectbox){
      var sbox = this.selectbox.getBBox()
      var new_selected = [];
      for(var i = 0; i < this.shapes.length; i++){
        if(this.rectsIntersect(this.shapes[i].getBBox(), sbox)){
          new_selected.push(this.shapes[i])
        }
      }
      
      if(new_selected.length == 1){
        this.select(this.selected[0])
      }else if(new_selected.length > 1){
        for(var i = 0; i < new_selected.length; i++){
          this.selectAdd(new_selected[i])
        }
      }else if(new_selected.length == 0){
        this.unselect()
      }
      if(this.selectbox.node.parentNode){
        this.selectbox.remove()
      }
      this.selectbox = null;
      
    }else{
      this.action = "";
    }
  }else if(this.selected.length == 1){
    if(this.selected[0].getBBox().height == 0 && this.selected[0].getBBox().width == 0){
      this.deleteShape(this.selected[0])
    }
    if(this.mode == "rect"){
      this.unselect()
    }else if(this.mode == "ellipse"){
      this.unselect()
    }else if(this.mode == "path"){
      this.unselect()
    }else if(this.mode == "line"){
      this.unselect()
    }else if(this.mode == "image"){
      this.unselect()
    }
  }
}

