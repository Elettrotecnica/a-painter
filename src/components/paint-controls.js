AFRAME.registerSystem('paint-controls', {
  numberStrokes: 0,
  tooltipFadeEvent: new Event('tooltip-fade'),
  tooltipsDisplayed: false,

  showTooltips: function (controllerName) {
    if (this.tooltipsDisplayed) { return; }

    for (const tooltipGroup of Utils.getTooltips(controllerName)) {
      tooltipGroup.setAttribute('visible', true);
      for (const tooltip of tooltipGroup.querySelectorAll('[tooltip]')) {
        tooltip.setAttribute('animation', {
	  dur: 1000,
	  delay: 2000,
	  property: 'tooltip.opacity',
	  from: 1.0,
	  to: 0.0,
	  startEvents: 'tooltip-fade'
	});
	tooltip.addEventListener('animationcomplete', this.hideTooltipLine, {once: true});
      }
    }

    this.tooltipsDisplayed = true;
  },

  hideTooltips: function () {
    this.numberStrokes++;

    // 3 Strokes to hide
    if (this.numberStrokes === 3) {
      for (const tooltip of document.querySelectorAll('[tooltip]')) {
	tooltip.dispatchEvent(this.tooltipFadeEvent);
      }
    }
  },

  hideTooltipLine: function (evt) {
    const line = evt.target.getObject3D('line');
    if (line) { line.visible = false; }
  }
});

/* globals AFRAME THREE */
AFRAME.registerComponent('paint-controls', {
  dependencies: ['brush'],

  schema: {
    hand: {
      type: 'string',
      oneOf: ['left', 'right'],
      default: 'left'
    },
    tipModel: {
      type: 'string',
      default: '#tipObj'
    },
    tooltips: {
      type: 'boolean',
      default: true
    }
  },

  init: function () {
    var highLightTextureUrl = 'assets/images/controller-pressed.png';
    var tooltipGroups = null;

    this.controller = null;
    this.modelLoaded = false;
    this.touchStarted = false;
    this.startAxis = 0;
    this.numberStrokes = 0;

    this.el.object3D.visible = false;

    this.onEnterVR = this.onEnterVR.bind(this);
    this.onModelLoaded = this.onModelLoaded.bind(this);
    this.onChangeBrushSizeAbs = this.onChangeBrushSizeAbs.bind(this);
    this.onChangeBrushSizeInc = this.onChangeBrushSizeInc.bind(this);
    this.onStartChangeBrushSize = this.onStartChangeBrushSize.bind(this);
    this.onControllerconnected = this.onControllerconnected.bind(this);
    this.onBrushSizeChanged = this.onBrushSizeChanged.bind(this);
    this.onBrushColorChanged = this.onBrushColorChanged.bind(this);
    this.onStrokeStarted = this.onStrokeStarted.bind(this);

    this.el.sceneEl.systems.material.loadTexture(highLightTextureUrl, {src: highLightTextureUrl}, this.createTexture.bind(this));
  },

  createTexture: function (texture) {
    var material = this.highLightMaterial = new THREE.MeshBasicMaterial();
    material.map = texture;
    material.needsUpdate = true;
  },

  createBrushTip: function (controllerName, hand) {
    // Create brush tip and position it dynamically based on our current controller
    this.brushTip = document.createElement('a-entity');
    this.brushTip.id = `${hand}-tip`;
    this.brushTip.setAttribute('brush-tip', {
      hand: hand, controller: controllerName, model: this.tipModel
    });
    this.brushTip.addEventListener('model-loaded', this.onModelLoaded);
    this.el.appendChild(this.brushTip);
  },

  changeBrushColor: function (color) {
    if (this.modelLoaded && !!this.buttonMeshes.sizeHint) {
      this.buttonMeshes.colorTip.material.color.copy(color);
      this.buttonMeshes.sizeHint.material.color.copy(color);
    }
  },

  changeBrushSize: function (size) {
    var scale = size / 2 * 10;
    if (this.modelLoaded && !!this.buttonMeshes.sizeHint) {
      this.buttonMeshes.sizeHint.scale.set(scale, 1, scale);
    }
  },

  // buttonId
  // 0 - trackpad
  // 1 - trigger ( intensity value from 0.5 to 1 )
  // 2 - grip
  // 3 - menu ( dispatch but better for menu options )
  // 4 - system ( never dispatched on this layer )
  mapping: {
    axis0: 'trackpad',
    axis1: 'trackpad',
    button0: 'trackpad',
    button1: 'trigger',
    button2: 'grip',
    button3: 'menu',
    button4: 'system'
  },

  update: function () {
    const controlConfiguration = {
      hand: this.data.hand,
      model: true
    };

    this.el.setAttribute('magicleap-controls', controlConfiguration);
    this.el.setAttribute('vive-controls', controlConfiguration);
    this.el.setAttribute('oculus-touch-controls', controlConfiguration);
    this.el.setAttribute('pico-controls', controlConfiguration);
    this.el.setAttribute('windows-motion-controls', controlConfiguration);
    this.el.setAttribute('hp-mixed-reality-controls', controlConfiguration);
  },

  addEventListeners: function () {
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR);
    this.el.addEventListener('model-loaded', this.onModelLoaded);
    this.el.addEventListener('changeBrushSizeAbs', this.onChangeBrushSizeAbs);
    this.el.addEventListener('changeBrushSizeInc', this.onChangeBrushSizeInc);
    this.el.addEventListener('startChangeBrushSize', this.onStartChangeBrushSize);
    this.el.addEventListener('controllerconnected', this.onControllerconnected);
    this.el.addEventListener('brushsize-changed', this.onBrushSizeChanged);
    this.el.addEventListener('brushcolor-changed', this.onBrushColorChanged);
    document.addEventListener('stroke-started', this.onStrokeStarted);
  },

  removeEventListeners: function () {
    this.el.sceneEl.removeEventListener('enter-vr', this.onEnterVR);
    this.el.removeEventListener('model-loaded', this.onModelLoaded);
    this.el.removeEventListener('changeBrushSizeAbs', this.onChangeBrushSizeAbs);
    this.el.removeEventListener('changeBrushSizeInc', this.onChangeBrushSizeInc);
    this.el.removeEventListener('startChangeBrushSize', this.onStartChangeBrushSize);
    this.el.removeEventListener('controllerconnected', this.onControllerconnected);
    this.el.removeEventListener('brushsize-changed', this.onBrushSizeChanged);
    this.el.removeEventListener('brushcolor-changed', this.onBrushColorChanged);
    document.removeEventListener('stroke-started', this.onStrokeStarted);
  },

  setModelVisibility: function (visible) {
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      mesh.visible = !!visible;
    }
  },

  play: function () {
    this.addEventListeners();
    this.setModelVisibility(true);
  },

  pause: function () {
    this.removeEventListeners();
    this.setModelVisibility(false);
  },

  onEnterVR: function () {
    this.el.object3D.visible = true;
  },

  onModelLoaded: function (evt) {
    // Only act on lone brush tip or custom model to set the button meshes, ignore anything else.
    if ((evt.target !== this.el && !evt.target.id.includes('-tip')) || this.buttonMeshes) { return; }

    var controllerObject3D = evt.detail.model;
    var buttonMeshes;

    buttonMeshes = this.buttonMeshes = {};

    buttonMeshes.sizeHint = controllerObject3D.getObjectByName('sizehint');
    buttonMeshes.colorTip = controllerObject3D.getObjectByName('tip');

    this.modelLoaded = true;

    this.changeBrushSize(this.el.components.brush.data.size);
    this.changeBrushColor(this.el.components.brush.color);
  },

  onChangeBrushSizeAbs: function (evt) {
    if (evt.detail.axis[1] === 0 && evt.detail.axis[3] === 0) { return; }

    var magnitude = evt.detail.axis[1] || evt.detail.axis[3];
    var delta = magnitude / 300;
    var size = this.el.components.brush.schema.size;
    var value = THREE.MathUtils.clamp(this.el.getAttribute('brush').size - delta, size.min, size.max);

    this.el.setAttribute('brush', 'size', value);
  },

  onChangeBrushSizeInc: function (evt) {
    if (evt.detail.axis[1] === 0 && evt.detail.axis[3] === 0) { return; }

    var magnitude = evt.detail.axis[1] || evt.detail.axis[3];

    if (this.touchStarted) {
      this.touchStarted = false;
      this.startAxis = (magnitude + 1) / 2;
    }

    var currentAxis = (magnitude + 1) / 2;
    var delta = (this.startAxis - currentAxis) / 2;

    this.startAxis = currentAxis;

    var startValue = this.el.getAttribute('brush').size;
    var size = this.el.components.brush.schema.size;
    var value = THREE.MathUtils.clamp(startValue - delta, size.min, size.max);

    this.el.setAttribute('brush', 'size', value);
  },

  onStartChangeBrushSize: function () {
    this.touchStarted = true;
  },

  onControllerconnected: function (evt) {
    var controllerName = evt.detail.name;
    var hand = evt.detail.component.data.hand;

    this.createBrushTip(controllerName, hand);

    if (this.data.tooltips) {
      this.system.showTooltips(controllerName);
    }

    this.controller = controllerName;
  },

  onBrushSizeChanged: function (evt) {
    this.changeBrushSize(evt.detail.size);
  },

  onBrushColorChanged: function (evt) {
    this.changeBrushColor(evt.detail.color);
  },

  onStrokeStarted: function (evt) {
    if (evt.detail.entity.components['paint-controls'] !== this) { return; }

    this.numberStrokes++;

    if (this.data.tooltips) {
      this.system.hideTooltips();
    }
  },

  onButtonEvent: function (id, evtName) {
    var buttonName = this.mapping['button' + id];
    this.el.emit(buttonName + evtName);
    this.updateModel(buttonName, evtName);
  },

  updateModel: function (buttonName, state) {
    var material = state === 'up' ? this.material : this.highLightMaterial;
    var buttonMeshes = this.buttonMeshes;
    var button = buttonMeshes && buttonMeshes[buttonName];
    if (state === 'down' && button && !this.material) {
      material = this.material = button.material;
    }
    if (!material) { return; }
    if (buttonName === 'grip') {
      buttonMeshes.grip.left.material = material;
      buttonMeshes.grip.right.material = material;
      return;
    }
    if (!button) { return; }
    button.material = material;
  }
});
