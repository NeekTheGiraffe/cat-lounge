import Phaser, { Scene } from "phaser";
import "./style.css";

const jumpStrength = 320;
const catSpeed = 200;

const replaceTileWithSprite = (
  tile: Phaser.Tilemaps.Tile,
  group: Phaser.Physics.Arcade.StaticGroup,
  layer: Phaser.Tilemaps.TilemapLayer,
  tileImageKey: string,
  body: {
    size: [number, number];
    offset: [number, number];
    checkCollision?: {
      up?: boolean;
      down?: boolean;
      right?: boolean;
      left?: boolean;
    };
  },
) => {
  const frame = tile.index - tile.tileset!.firstgid;
  const sprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody = group.create(
    tile.getCenterX(),
    tile.getCenterY(),
    tileImageKey,
    frame,
  );
  sprite.body.setSize(...body.size).setOffset(...body.offset);

  if (body.checkCollision) {
    Object.entries(body.checkCollision).forEach(([key, val]) => {
      const k = key as keyof Phaser.Types.Physics.Arcade.ArcadeBodyCollision;
      sprite.body.checkCollision[k] = val;
    });
  }
  layer.removeTileAt(tile.x, tile.y);
};

class GameScene extends Scene {
  private cat: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | undefined;
  // private floor: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | undefined;
  private keyboard: Record<string, Phaser.Input.Keyboard.Key>;
  private catGrounded: boolean;
  private catBusy: boolean;

  constructor() {
    super("Game");
    this.keyboard = {};
    this.catGrounded = false;
    this.catBusy = false;
  }

  // init(data: object) {}
  init() {}

  preload() {
    this.load.spritesheet("cat", "/output.png", { frameWidth: 96, spacing: 4 });

    this.load.tilemapTiledJSON("map", "/room.tmj");
    this.load.spritesheet("tile_indoors", "/obj_indoors.png", {
      frameWidth: 32,
    });
    this.load.spritesheet("tile_room", "/tile_room.png", { frameWidth: 32 });
    this.load.image("tile_wall", "/tile_wall.png");
  }

  create() {
    // const { width, height } = this.sys.game.canvas;

    const tilemap = this.make.tilemap({ key: "map" });
    const indoorsTileset = tilemap.addTilesetImage("indoors", "tile_indoors")!;
    const roomTileset = tilemap.addTilesetImage("tile_room", "tile_room")!;
    const wallTileset = tilemap.addTilesetImage("wall", "tile_wall")!;

    tilemap.createLayer("Wall Base", wallTileset, 0, 0);
    tilemap.createLayer("Wall Doors", wallTileset, 0, 0);
    const pillarsLayer = tilemap.createLayer("Pillars", roomTileset, 0, 0)!;
    const floorLayer = tilemap.createLayer("Floor", roomTileset, 0, 0)!;
    const furnitureBaseLayer = tilemap.createLayer(
      "Furniture Base",
      indoorsTileset,
      0,
      0,
    );
    tilemap.createLayer("Furniture Decor", indoorsTileset, 0, 0);
    const furnitureFrontLayer = tilemap
      .createLayer("Furniture Front", indoorsTileset, 0, 0)
      ?.setDepth(1);

    const wallsGroup = this.physics.add.staticGroup();
    const furnitureGroup = this.physics.add.staticGroup();

    pillarsLayer.forEachTile((tile) => {
      if (tile.properties.right_facing_pillar) {
        replaceTileWithSprite(tile, wallsGroup, pillarsLayer, "tile_room", {
          size: [16, 32],
          offset: [0, 0],
          checkCollision: { up: false, down: false },
        });
      }
      if (tile.properties.left_facing_pillar) {
        replaceTileWithSprite(tile, wallsGroup, pillarsLayer, "tile_room", {
          size: [16, 32],
          offset: [16, 0],
          checkCollision: { up: false, down: false },
        });
      }
    });
    floorLayer.setCollisionByProperty({ floor: true });
    furnitureFrontLayer?.forEachTile((tile) => {
      if (tile.properties.table) {
        replaceTileWithSprite(
          tile,
          furnitureGroup,
          furnitureFrontLayer,
          "tile_indoors",
          {
            size: [32, 10],
            offset: [0, 22],
          },
        );
      }
    });
    furnitureBaseLayer?.forEachTile((tile) => {
      if (tile.properties.shelf_top) {
        replaceTileWithSprite(
          tile,
          furnitureGroup,
          furnitureBaseLayer,
          "tile_indoors",
          {
            size: [32, 6],
            offset: [0, 4],
            checkCollision: { down: false, left: false, right: false },
          },
        );
      }
    });

    const debugGraphics = this.add.graphics().setAlpha(0.75);
    floorLayer.renderDebug(debugGraphics, {
      tileColor: null, // Color of non-colliding tiles
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
      faceColor: new Phaser.Display.Color(40, 39, 37, 255), // Color of colliding face edges
    });

    this.anims.create({
      key: "cat-idle",
      frameRate: 6,
      frames: this.anims.generateFrameNumbers("cat", {
        frames: [0, 1, 2, 3, 0],
      }),
      repeat: -1,
      repeatDelay: 1500,
    });
    this.anims.create({
      key: "cat-walk",
      frameRate: 10,
      frames: this.anims.generateFrameNumbers("cat", { start: 32, end: 39 }),
      repeat: -1,
    });
    this.anims.create({
      key: "cat-jump",
      frameRate: 4,
      frames: this.anims.generateFrameNumbers("cat", { start: 65, end: 68 }),
      repeat: 0,
    });
    this.anims.create({
      key: "cat-paw",
      frameRate: 12,
      frames: this.anims.generateFrameNumbers("cat", { start: 56, end: 61 }),
      repeat: 0,
    });
    this.anims.create({
      key: "cat-sleep",
      frameRate: 2,
      frames: this.anims.generateFrameNumbers("cat", {
        frames: [48, 49, 50, 51, 48],
      }),
      repeat: -1,
      repeatDelay: 2000,
    });

    this.cat = this.physics.add
      .sprite(30, 230, "cat")
      .setCollideWorldBounds(true);
    this.cat.name = "cat";
    this.cat.setOrigin(0, 1);
    this.cat.body
      .setSize(this.cat.displayWidth / 3, this.cat.displayHeight / 4)
      .setOffset(this.cat.displayWidth / 3, (this.cat.displayHeight * 3) / 4);

    this.physics.add.collider(this.cat, wallsGroup);
    this.physics.add.collider(this.cat, floorLayer, (obj1, obj2) => {
      const o1 = obj1 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const o2 = obj2 as Phaser.Tilemaps.Tile;
      if (o1.body.bottom < o2.bottom) {
        this.catGrounded = true;
      }
    });
    this.physics.add.collider(this.cat, furnitureGroup, (obj1, obj2) => {
      const o1 = obj1 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const o2 = obj2 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (o1.body.bottom < o2.body.bottom) {
        this.catGrounded = true;
      }
    });

    this.addKeys(["W", "A", "S", "D", "E"]);

    this.cat.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key === "cat-paw") {
        this.catBusy = false;
        this.cat!.play("cat-idle");
      }
    });
  }

  update() {
    if (!this.cat) throw new Error("Game objects not initialized properly");

    if (this.keyboard["A"].isDown && !this.keyboard["D"].isDown) {
      this.cat.setVelocityX(-catSpeed);
      this.cat.flipX = true;
      if (this.catGrounded) {
        this.cat.play("cat-walk", true);
        this.catBusy = false;
      }
    } else if (this.keyboard["D"].isDown && !this.keyboard["A"].isDown) {
      this.cat.setVelocityX(catSpeed);
      this.cat.flipX = false;
      if (this.catGrounded) {
        this.cat.play("cat-walk", true);
        this.catBusy = false;
      }
    } else {
      this.cat.setVelocityX(0);
      if (this.catGrounded && !this.catBusy) this.cat.play("cat-idle", true);
    }

    if (this.keyboard["E"].isDown && this.catGrounded) {
      this.cat.play("cat-paw", true);
      this.catBusy = true;
    }

    if (this.keyboard["S"].isDown && this.catGrounded) {
      this.cat.play("cat-sleep", true);
      this.catBusy = true;
    }

    if (this.keyboard["W"].isDown && this.catGrounded) {
      this.cat.setVelocity(-jumpStrength).play("cat-jump");
    }

    if (this.cat.body.velocity.y > 0) {
      this.cat.setFrame(68);
    }

    this.catGrounded = false;
  }

  addKeys(keys: string[]) {
    if (!this.input.keyboard) return;

    for (const key of keys) {
      this.keyboard[key] = this.input.keyboard.addKey(key);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 704,
  height: 480,
  parent: "phaser-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 400 },
      debug: true,
    },
  },
  antialias: false,
  scene: GameScene,
});
