/* globals AFRAME THREE */
AFRAME.registerComponent('brush', {
  schema: {
    hand: {type: 'string', oneOf: ['left', 'right', ''], default: ''},
    color: {type: 'color', default: '#ef2d5e'},
    size: {default: 0.01, min: 0.001, max: 0.3},
    sizeModifier: {type: 'number', default: 0.0},
    brush: {default: 'smooth'},
    owner: {type: 'string', default: 'local'},
    enabled: { type: 'boolean', default: true },
    undo: {type: 'int', default: 0}
  },
  init: function () {
    var data = this.data;
    this.color = new THREE.Color(data.color);

    this.el.emit('brushcolor-changed', {color: this.color});
    this.el.emit('brushsize-changed', {brushSize: data.size});

    this.obj = this.el.object3D;

    this.currentStroke = null;
    this.strokeEntities = [];

    this.textures = {};
    this.currentMap = 0;

    this.model = this.el.getObject3D('mesh');
    this.drawing = false;

    this.onUndo = this.onUndo.bind(this);
    this.onPaint = this.onPaint.bind(this);

    if (this.data.hand === '') {
      this.hand = this.el.id.endsWith('right-hand') ? 'right' : 'left';
    } else {
      this.hand = this.data.hand;
    }
  },
  play: function () {
    this.el.addEventListener('undo', this.onUndo);
    this.el.addEventListener('paint', this.onPaint);
  },
  pause: function () {
    this.el.removeEventListener('undo', this.onUndo);
    this.el.removeEventListener('paint', this.onPaint);
  },
  update: function (oldData) {
    var data = this.data;

    // The undo property is useful on remote brushes: these will
    // receive the message to undo from the network, rather than
    // actual UI events.
    while (this.data.undo > 0) {
      this.undo();
      this.data.undo--;
    }

    if (oldData.sizeModifier !== this.data.sizeModifier) {
      this.paint();
    }
    if (oldData.color !== data.color) {
      this.color.set(data.color);
      this.el.emit('brushcolor-changed', {color: this.color});
    }
    if (oldData.size !== data.size) {
      this.el.emit('brushsize-changed', {size: data.size});
    }
  },
  tick: (function () {
    var position = new THREE.Vector3();
    var rotation = new THREE.Quaternion();
    var scale = new THREE.Vector3();

    return function tick (time, delta) {
      if (this.currentStroke && this.active) {
        this.obj.matrixWorld.decompose(position, rotation, scale);
        var pointerPosition = this.system.getPointerPosition(position, rotation, this.hand);
        this.currentStroke.addPoint(position, rotation, pointerPosition, this.sizeModifier, time);
      }
    };
  })(),
  remove: function () {
    this.clear();
  },
  startNewStroke: function () {
    this.el.components.ui?.playSound('ui_paint');
    this.currentStroke = this.system.addNewStroke(this.data.brush, this.color, this.data.size, this.data.owner);
    this.el.emit('stroke-started', {entity: this.el, stroke: this.currentStroke});
  },
  paint: function () {
    this.sizeModifier = this.data.enabled ? this.data.sizeModifier : 0;
    if (this.sizeModifier > 0.1) {
      if (!this.active) {
        this.startNewStroke();
        this.active = true;
      }
    } else {
      if (this.active) {
        this.previousEntity = this.currentEntity;
        this.currentStroke = null;
	this.active = false;
      }
    }
  },
  undo: function() {
    this.system.undo(this.data.owner);
  },
  clear: function() {
    this.system.clear(this.data.owner);
  },
  onUndo: function (evt) {
    if (!this.data.enabled) { return; }
    this.undo();
    this.el.components.ui?.playSound('ui_undo');
  },
  onPaint: function (evt) {
    // Trigger
    this.data.sizeModifier = evt.detail.value;
    this.paint();
  }
});
