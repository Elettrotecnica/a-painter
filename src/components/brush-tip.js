AFRAME.registerComponent('brush-tip', {
  schema: {
    controller: { type: 'string' },
    hand: { 
      type: 'string',
      oneOf: ['left', 'right']
    },
    model: {
      type: 'string',
      default: '#tipObj'
    }
  },

  init: function () {
    var toRad = degrees => THREE.MathUtils.degToRad(degrees);
    // At least some rotation offset is necessary to differentiate
    // left from right. We also want the tip to appear somewhat on the
    // top of our controller.  The following configuration works on
    // Quest devices at the time of writing and should not be too bad
    // for others, but in case, a special offset can be used depending
    // on the controller.
    this.controllers = {
      'default': {
        left: {
          positionOffset: { x: 0, y: -0.025, z: -0.042 },
          rotationOffset: { x: toRad(-45), y: toRad(7), z: toRad(-7) }
        },
        right: {
          positionOffset: { x: 0, y: -0.025, z: -0.042 },
          rotationOffset: { x: toRad(-45), y: toRad(-7), z: toRad(7) }
        }
      }
    };

    if (this.data.controller) {
      this.setController(this.data.controller, this.data.hand);
    }

    this.el.setAttribute('gltf-model', this.data.model);
  },

  setController: function (controller, hand) {
    if (!this.controllers[controller]) {
      controller = 'default';
    }

    this.el.object3D.position.set(
      this.controllers[controller][hand].positionOffset.x,
      this.controllers[controller][hand].positionOffset.y,
      this.controllers[controller][hand].positionOffset.z
    );
    this.el.object3D.rotation.set(
      this.controllers[controller][hand].rotationOffset.x,
      this.controllers[controller][hand].rotationOffset.y,
      this.controllers[controller][hand].rotationOffset.z
    )
  }
});
