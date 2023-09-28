import Phaser, { Scene } from "phaser";

type CollisionObject =
  | Phaser.Tilemaps.Tile
  | Phaser.Types.Physics.Arcade.GameObjectWithBody;

interface KeyBindings {
  moveLeft: string | number;
  moveRight: string | number;
  jump: string | number;
  sleep: string | number;
  paw: string | number;
}

const createCollisionCallback = (
  group: Phaser.Physics.Arcade.StaticGroup | Phaser.Tilemaps.TilemapLayer,
  cat: Cat,
): ((obj1: CollisionObject, obj2: CollisionObject) => void) => {
  if (group instanceof Phaser.Tilemaps.TilemapLayer) {
    return (obj1, obj2) => {
      const o1 = obj1 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const o2 = obj2 as Phaser.Tilemaps.Tile;
      if (o1.body.bottom < o2.bottom) {
        cat.grounded = true;
      }
    };
  }
  return (obj1, obj2) => {
    const o1 = obj1 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const o2 = obj2 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    if (o1.body.bottom < o2.body.bottom) {
      cat.grounded = true;
    }
  };
};

export default class Cat {
  private sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  grounded: boolean = false;
  busy: boolean = false;
  keyBindings: KeyBindings;
  speed: number;
  jumpStrength: number;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    speed: number,
    jumpStrength: number,
    wallGroups: Phaser.Physics.Arcade.StaticGroup[],
    groundGroups: (
      | Phaser.Physics.Arcade.StaticGroup
      | Phaser.Tilemaps.TilemapLayer
    )[],
    keyBindings: KeyBindings,
  ) {
    this.sprite = scene.physics.add
      .sprite(x, y, "cat")
      .setOrigin(0, 1)
      .setCollideWorldBounds(true);
    this.sprite.name = "cat";
    this.sprite.body
      .setSize(this.sprite.displayWidth / 3, this.sprite.displayHeight / 4)
      .setOffset(
        this.sprite.displayWidth / 3,
        (this.sprite.displayHeight * 3) / 4,
      );

    this.keyBindings = keyBindings;
    this.jumpStrength = jumpStrength;
    this.speed = speed;

    for (const wallGroup of wallGroups) {
      scene.physics.add.collider(this.sprite, wallGroup);
    }
    for (const groundGroup of groundGroups) {
      scene.physics.add.collider(
        this.sprite,
        groundGroup,
        createCollisionCallback(groundGroup, this),
      );
    }

    this.sprite.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key === "cat-paw") {
        this.busy = false;
        this.sprite.play("cat-idle");
      }
    });
  }

  handleInput(keyboard: Record<string, Phaser.Input.Keyboard.Key>) {
    const { moveLeft, moveRight, jump, sleep, paw } = this.keyBindings;

    if (keyboard[moveLeft].isDown && !keyboard[moveRight].isDown) {
      this.sprite.setVelocityX(-this.speed);
      this.sprite.flipX = true;
      if (this.grounded) {
        this.sprite.play("cat-walk", true);
        this.busy = false;
      }
    } else if (keyboard[moveRight].isDown && !keyboard[moveLeft].isDown) {
      this.sprite.setVelocityX(this.speed);
      this.sprite.flipX = false;
      if (this.grounded) {
        this.sprite.play("cat-walk", true);
        this.busy = false;
      }
    } else {
      this.sprite.setVelocityX(0);
      if (this.grounded && !this.busy) this.sprite.play("cat-idle", true);
    }

    if (keyboard[paw].isDown && this.grounded) {
      this.sprite.play("cat-paw", true);
      this.busy = true;
    }

    if (keyboard[sleep].isDown && this.grounded) {
      this.sprite.play("cat-sleep", true);
      this.busy = true;
    }

    if (keyboard[jump].isDown && this.grounded) {
      this.sprite.setVelocity(-this.jumpStrength).play("cat-jump");
    }

    if (this.sprite.body.velocity.y > 0) {
      this.sprite.setFrame(68);
    }
  }

  update() {
    this.grounded = false;
  }
}
