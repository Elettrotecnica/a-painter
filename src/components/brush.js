/* globals AFRAME THREE */
AFRAME.registerComponent('brush', {
  schema: {
    color: {type: 'color', default: '#ef2d5e'},
    size: {default: 0.01, min: 0.001, max: 0.3},
    brush: {default: 'smooth'},
    enabled: { type: 'boolean', default: true }
  },
  init: function () {
    var data = this.data;
    this.color = new THREE.Color(data.color);

    this.el.emit('brushcolor-changed', {color: this.color});
    this.el.emit('brushsize-changed', {brushSize: data.size});

    this.active = false;
    this.obj = this.el.object3D;

    this.currentStroke = null;
    this.strokeEntities = [];

    this.sizeModifier = 0.0;
    this.textures = {};
    this.currentMap = 0;

    this.model = this.el.getObject3D('mesh');
    this.drawing = false;

    this.undoSoundEffect = document.getElementById('ui_undo');
    this.paintSoundEffect = document.getElementById('ui_paint');

    this.onUndo = this.onUndo.bind(this);
    this.onPaint = this.onPaint.bind(this);

    this.el.addEventListener('undo', this.onUndo);
    this.el.addEventListener('paint', this.onPaint);

    this.hand = this.el.id === 'right-hand' ? 'right' : 'left';
  },
  update: function (oldData) {
    var data = this.data;

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
  startNewStroke: function () {
    this.paintSoundEffect.play();
    this.currentStroke = this.system.addNewStroke(this.data.brush, this.color, this.data.size);
    this.el.emit('stroke-started', {entity: this.el, stroke: this.currentStroke});
  },
  onUndo: function (evt) {
    if (!this.data.enabled) { return; }
    this.system.undo();
    this.undoSoundEffect.play();
  },
  onPaint: function (evt) {
    if (!this.data.enabled) { return; }
    // Trigger
    var value = evt.detail.value;
    this.sizeModifier = value;
    if (value > 0.1) {
      if (!this.active) {
        this.startNewStroke();
        this.active = true;
      }
    } else {
      if (this.active) {
        this.previousEntity = this.currentEntity;
        this.currentStroke = null;
      }
      this.active = false;
    }
  }
});
