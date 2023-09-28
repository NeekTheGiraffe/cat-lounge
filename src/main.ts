import Phaser, { Scene } from "phaser";
import "./style.css";
import Cat from "./Cat";

import KeyCodes = Phaser.Input.Keyboard.KeyCodes;

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
  private cats: Cat[] = [];
  private keyboard: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super("Game");
    this.keyboard = {};
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
      if (tile.properties.chair_left_facing) {
        replaceTileWithSprite(
          tile,
          furnitureGroup,
          furnitureBaseLayer,
          "tile_indoors",
          {
            size: [28, 6],
            offset: [14, 10],
            checkCollision: { down: false, left: false, right: false },
          },
        );
      }
      if (tile.properties.chair_right_facing) {
        replaceTileWithSprite(
          tile,
          furnitureGroup,
          furnitureBaseLayer,
          "tile_indoors",
          {
            size: [28, 6],
            offset: [-10, 10],
            checkCollision: { down: false, left: false, right: false },
          },
        );
      }
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

    this.addKeys(["W", "A", "S", "D", "E"]);
    this.addKeys([
      KeyCodes.UP,
      KeyCodes.LEFT,
      KeyCodes.DOWN,
      KeyCodes.RIGHT,
      KeyCodes.COMMA,
    ]);

    this.cats.push(
      new Cat(
        this,
        30,
        230,
        catSpeed,
        jumpStrength,
        [wallsGroup],
        [floorLayer, furnitureGroup],
        {
          jump: "W",
          moveLeft: "A",
          sleep: "S",
          moveRight: "D",
          paw: "E",
        },
      ),
      new Cat(
        this,
        400,
        100,
        catSpeed,
        jumpStrength,
        [wallsGroup],
        [floorLayer, furnitureGroup],
        {
          jump: KeyCodes.UP,
          moveLeft: KeyCodes.LEFT,
          sleep: KeyCodes.DOWN,
          moveRight: KeyCodes.RIGHT,
          paw: KeyCodes.COMMA,
        },
      ),
    );
  }

  update() {
    if (this.cats.length !== 2)
      throw new Error("Game objects not initialized properly");

    this.cats.forEach((cat) => cat.handleInput(this.keyboard));
    this.cats.forEach((cat) => cat.update());
  }

  addKeys(keys: (string | number)[]) {
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
    },
  },
  antialias: false,
  scene: GameScene,
});
