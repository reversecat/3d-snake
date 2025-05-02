import * as THREE from "three";
import { BoxGeometry, Mesh, MeshBasicMaterial, Object3DEventMap } from "three";

const BLOCKS_DIM_COUNT = 15;
const HALF_BLOCKS_DIM_COUNT = Math.floor(BLOCKS_DIM_COUNT / 2);
const MOVES_PER_SECOND = 8;
const SNAKE_COLOR = 0x3aeb34;
const SNAKE_DEATH_COLOR = 0x595959;
const FOOD_COLOR = 0xeb3434;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const loader = new THREE.TextureLoader();
function loadColorTexture(path: string) {
	const texture = loader.load(path);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

const snakeMaterial = new THREE.MeshBasicMaterial({ map: loadColorTexture("/snake.jpg") });
const snakeDeathMaterial = new THREE.MeshBasicMaterial({
	map: loadColorTexture("/snakeDeath.jpg"),
});
const sceneMaterial = new THREE.MeshBasicMaterial({ map: loadColorTexture("/cell.jpg") });
const foodMaterial = new THREE.MeshBasicMaterial({ color: FOOD_COLOR });
const cube = new THREE.BoxGeometry(1, 1, 1);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

enum Direction {
	Up,
	Right,
	Down,
	Left,
	None,
	Falling,
}

class Point {
	x: number;
	y: number;
	z: number;
	constructor(x: number, y: number, z: number = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	toStr = (): string => {
		return this.x.toString() + "," + this.y.toString();
	};
}

interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

function collisionBoundingBox(r1: Rect, r2: Rect): boolean {
	if (r1.x + r1.w > r2.x && r1.x < r2.x + r2.w && r1.y + r1.h > r2.y && r1.y < r2.y + r2.h) {
		return true;
	}
	return false;
}

class SnakeBody {
	pos: Point;
	active: number; // if 0 is active, otherwise its a postive number that decrements each tick
	three_obj: Mesh<BoxGeometry, MeshBasicMaterial, Object3DEventMap>;

	constructor(x: number, y: number, active: number = 0) {
		this.pos = new Point(x, y, 1);
		this.active = active;
		this.three_obj = new THREE.Mesh(cube, snakeMaterial);
		this.three_obj.position.set(this.pos.x, this.pos.y, this.pos.z);
		scene.add(this.three_obj);
	}

	updatePos = (): void => {
		this.three_obj.position.set(this.pos.x, this.pos.y, this.pos.z);
	};

	dieEffect = (): void => {
		scene.remove(this.three_obj);
		this.three_obj = new THREE.Mesh(cube, snakeDeathMaterial);
		this.three_obj.position.set(this.pos.x, this.pos.y, 1);
		scene.add(this.three_obj);
	};

	delete = (): void => {
		scene.remove(this.three_obj);
	};
}

class Snake {
	direction: Direction;
	nextDirection: Direction;
	body: Array<SnakeBody>;
	size: number;
	speed: number;
	alive: boolean = true;

	constructor(x: number, y: number) {
		this.direction = Direction.None;
		this.nextDirection = Direction.None;
		this.body = [];
		this.size = 1;
		this.speed = 1;

		this.body.push(new SnakeBody(x, y));
	}

	getHead = (): Point => {
		return this.body[0].pos;
	};

	getTail = (): Point => {
		return this.body[this.body.length - 1].pos;
	};

	checkCollisions = (): void => {
		if (!this.alive) return;

		// Self collision:
		// Don't need to check self collisions if snake length < 4
		for (let i = 3; i < this.body.length; i++) {
			if (this.body[i].active !== 0) continue; // since new pieces stay at head until snake moves past
			const rect1 = { x: this.getHead().x, y: this.getHead().y, w: this.size, h: this.size };
			const rect2 = {
				x: this.body[i].pos.x,
				y: this.body[i].pos.y,
				w: this.size,
				h: this.size,
			};
			if (collisionBoundingBox(rect1, rect2)) this.die();
		}

		// Off screen death:
		if (
			this.getHead().x < 0 ||
			this.getHead().x >= BLOCKS_DIM_COUNT ||
			this.getHead().y < 0 ||
			this.getHead().y >= BLOCKS_DIM_COUNT
		) {
			this.die();
			this.direction = Direction.Falling;
			this.nextDirection = Direction.None;
		}
	};

	die = (): void => {
		this.alive = false;
		// need to remove inactive snake parts from scene
		this.body
			.filter((cell) => cell.active !== 0)
			.forEach((cell) => {
				cell.delete();
			});
		// remove snake parts that aren't active yet
		this.body = this.body.filter((cell) => cell.active === 0);
		setTimeout(resetGame, 3000);
	};

	setDirection = (direction: Direction): void => {
		if (!this.alive) return;
		if (this.body.length === 1) {
			this.direction = direction;
			return;
		}
		// Don't allow for opposite movement if snake is longer than just a head
		if (
			(this.direction === Direction.Up || this.direction === Direction.Down) &&
			(direction === Direction.Left || direction === Direction.Right)
		) {
			this.nextDirection = direction;
		} else if (
			(this.direction === Direction.Left || this.direction === Direction.Right) &&
			(direction === Direction.Up || direction === Direction.Down)
		) {
			this.nextDirection = direction;
		}
	};
	move = (): void => {
		// update direction if needed
		if (this.nextDirection !== Direction.None) {
			this.direction = this.nextDirection;
			this.nextDirection = Direction.None;
		}

		// for death animation:
		if (!this.alive && this.direction != Direction.Falling) {
			for (let i = 0; i < this.body.length; i++) {
				if (this.body[i].active != -1) {
					this.body[i].active = -1;
					this.body[i].dieEffect();
					return;
				}
			}
			return;
		}

		// Loop from tail to head, moving each piece to the one ahead of it
		for (let i = this.body.length - 1; i > 0; i--) {
			if (this.body[i].active === 0) {
				this.body[i].pos.x = this.body[i - 1].pos.x;
				this.body[i].pos.y = this.body[i - 1].pos.y;
				this.body[i].pos.z = this.body[i - 1].pos.z;
				this.body[i].updatePos();
			} else {
				this.body[i].active--;
			}
		}
		// Move snake head
		switch (this.direction) {
			case Direction.Up:
				this.getHead().y += this.speed;
				break;
			case Direction.Right:
				this.getHead().x += this.speed;
				break;
			case Direction.Down:
				this.getHead().y -= this.speed;
				break;
			case Direction.Left:
				this.getHead().x -= this.speed;
				break;
			case Direction.Falling:
				this.getHead().z -= this.speed;
				break;
		}
		this.body[0].updatePos();
	};
}

type foodPositions = {
	[key: string]: boolean;
};

class Food {
	pos: Point;
	three_obj: Mesh<BoxGeometry, MeshBasicMaterial, Object3DEventMap>;

	constructor(x: number, y: number) {
		this.pos = new Point(x, y);
		this.three_obj = new THREE.Mesh(cube, foodMaterial);
		this.three_obj.position.set(this.pos.x, this.pos.y, 1);
		scene.add(this.three_obj);
	}

	delete = (): void => {
		scene.remove(this.three_obj);
	};
}

let player = new Snake(0, 0);
let foodArr: Array<Food> = [];

// TODO: Function can be optimized by keeping a global state of available positions and simply removing 1 as snake moves vs
// calculating each time.
function createFood() {
	let possible_pts: foodPositions = {};
	for (let i = 0; i < BLOCKS_DIM_COUNT; i += 1) {
		for (let j = 0; j < BLOCKS_DIM_COUNT; j += 1) {
			let pos = new Point(i, j);
			possible_pts[pos.toStr()] = true;
		}
	}
	// Remove overlapping points with Snake
	const snakeBody: Array<SnakeBody> = player.body;
	snakeBody.forEach((cell) => {
		if (cell.pos.toStr() in possible_pts) {
			delete possible_pts[cell.pos.toStr()];
		}
	});

	// Remove overlapping points with Food (in-case you want multiple food on map)
	foodArr.forEach((cell) => {
		if (cell.pos.toStr() in possible_pts) {
			delete possible_pts[cell.pos.toStr()];
		}
	});

	let possible_pts_arr: string[] = Object.keys(possible_pts);

	// TODO: Handle no more space for food

	if (possible_pts_arr.length <= 0) throw new Error("No possible points for food");

	let random_pos: string = possible_pts_arr[Math.floor(Math.random() * possible_pts_arr.length)];

	let new_food = new Food(parseInt(random_pos.split(",")[0]), parseInt(random_pos.split(",")[1]));
	foodArr.push(new_food);
}

window.addEventListener(
	"keydown",
	function (event) {
		if (event.defaultPrevented) {
			return; // Do nothing if the event was already processed
		}
		if (event.key == "ArrowUp" || event.code == "KeyW") {
			player.setDirection(Direction.Up);
		} else if (event.key == "ArrowRight" || event.code == "KeyD") {
			player.setDirection(Direction.Right);
		} else if (event.key == "ArrowDown" || event.code == "KeyS") {
			player.setDirection(Direction.Down);
		} else if (event.key == "ArrowLeft" || event.code == "KeyA") {
			player.setDirection(Direction.Left);
		}

		// Cancel the default action to avoid it being handled twice
		event.preventDefault();
	},
	true
);

// Game loop
function gameTick() {
	// check food collisions
	let removeIdx = -1;
	for (let i = 0; i < foodArr.length; i++) {
		const curFood = foodArr[i];
		const snakeHead = player.getHead();
		if (
			collisionBoundingBox(
				{ x: snakeHead.x, y: snakeHead.y, w: player.size, h: player.size },
				{ x: curFood.pos.x, y: curFood.pos.y, w: 1, h: 1 }
			)
		) {
			player.body.push(new SnakeBody(curFood.pos.x, curFood.pos.y, player.body.length));
			removeIdx = i;
			break;
		}
	}
	if (removeIdx !== -1) {
		foodArr[removeIdx].delete(); // remove food from three scene first
		foodArr.splice(removeIdx, 1);
		createFood();
	}

	player.checkCollisions();
	player.move();
}

function resetGame() {
	// Clear three scene
	foodArr.forEach((cell) => cell.delete());
	player.body.forEach((cell) => cell.delete());

	const cubes = [];
	for (let i = 0; i < BLOCKS_DIM_COUNT; i++) {
		let arr = [];
		for (let j = 0; j < BLOCKS_DIM_COUNT; j++) {
			arr.push(new THREE.Mesh(cube, sceneMaterial));
			arr[j].position.set(i, j, 0);
			scene.add(arr[j]);
		}
		cubes.push(arr);
	}

	player = new Snake(0, 0);
	foodArr = [];

	for (let i = 0; i < 5; i++) {
		createFood();
	}
}

function gameLoop() {
	// typically 60 frames per second
	let counter = 0;
	let step_count = Math.floor(60 / MOVES_PER_SECOND);
	function loop() {
		if (counter >= step_count) {
			gameTick();
			renderer.render(scene, camera);
			counter = 0;
		}
		counter++;
		requestAnimationFrame(loop);
	}
	requestAnimationFrame(loop);
}

resetGame();
gameLoop();

camera.position.set(
	HALF_BLOCKS_DIM_COUNT + 1,
	-HALF_BLOCKS_DIM_COUNT + 2,
	HALF_BLOCKS_DIM_COUNT + 2
);
camera.lookAt(HALF_BLOCKS_DIM_COUNT + 1, HALF_BLOCKS_DIM_COUNT + 1, 0);
