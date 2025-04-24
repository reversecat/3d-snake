const BLOCK_SIZE = 25;
const MOVES_PER_SECOND = 8;

enum Direction {
	Up,
	Right,
	Down,
	Left,
	None,
}

class Point {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
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

	constructor(x: number, y: number, active: number = 0) {
		this.pos = new Point(x, y);
		this.active = active;
	}
}

class Snake {
	direction: Direction;
	body: Array<SnakeBody>;
	size: number;
	speed: number;
	alive: boolean = true;

	constructor(x: number, y: number) {
		this.direction = Direction.None;
		this.body = [];
		this.size = BLOCK_SIZE;
		this.speed = BLOCK_SIZE;

		this.body.push(new SnakeBody(x, y));
	}

	getHead = (): Point => {
		return this.body[0].pos;
	};

	getTail = (): Point => {
		return this.body[this.body.length - 1].pos;
	};

	checkCollisions = (): void => {
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

		// Off screen collision:
		if (
			this.getHead().x < 0 ||
			this.getHead().x >= canvas.width ||
			this.getHead().y < 0 ||
			this.getHead().y >= canvas.height
		) {
			this.die();
		}
	};

	die = (): void => {
		this.alive = false;
	};

	setDirection = (direction: Direction): void => {
		if (this.body.length === 1) this.direction = direction;
		// Don't allow for opposite movement if snake is longer than just a head
		if (
			(this.direction === Direction.Up || this.direction === Direction.Down) &&
			(direction === Direction.Left || direction === Direction.Right)
		) {
			this.direction = direction;
		} else if (
			(this.direction === Direction.Left || this.direction === Direction.Right) &&
			(direction === Direction.Up || direction === Direction.Down)
		) {
			this.direction = direction;
		}
	};
	move = (): void => {
		// for death animation:
		if (!this.alive) {
			for (let i = 0; i < this.body.length; i++) {
				if (this.body[i].active != -1) {
					this.body[i].active = -1;
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
			} else {
				this.body[i].active--;
			}
		}
		// Move snake head
		switch (this.direction) {
			case Direction.Up:
				this.getHead().y -= this.speed;
				break;
			case Direction.Right:
				this.getHead().x += this.speed;
				break;
			case Direction.Down:
				this.getHead().y += this.speed;
				break;
			case Direction.Left:
				this.getHead().x -= this.speed;
				break;
		}
	};
}

type foodPositions = {
	[key: string]: boolean;
};

// TODO: Function can be optimized by keeping a global state of available positions and simply removing 1 as snake moves vs
// calculating each time.
function createFood() {
	let possible_pts: foodPositions = {};
	for (let i = 0; i < canvas.width; i += BLOCK_SIZE) {
		for (let j = 0; j < canvas.height; j += BLOCK_SIZE) {
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
		if (cell.toStr() in possible_pts) {
			delete possible_pts[cell.toStr()];
		}
	});

	let possible_pts_arr: string[] = Object.keys(possible_pts);

	// TODO: Handle no more space for food

	if (possible_pts_arr.length <= 0) throw new Error("No possible points for food");

	let random_pos: string = possible_pts_arr[Math.floor(Math.random() * possible_pts_arr.length)];
	let new_food = new Point(
		parseInt(random_pos.split(",")[0]),
		parseInt(random_pos.split(",")[1])
	);
	foodArr.push(new_food);
}

const canvas = <HTMLCanvasElement>document.getElementById("game");
const ctx = canvas.getContext("2d");
const player = new Snake(0, 0);
let foodArr: Array<Point> = [];

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

function gameDraw() {
	ctx!.fillStyle = "black";
	ctx?.fillRect(0, 0, canvas.width, canvas.height);

	// draw food
	ctx!.fillStyle = "red";
	foodArr.forEach((cell) => {
		ctx?.fillRect(cell.x, cell.y, BLOCK_SIZE, BLOCK_SIZE);
	});

	// draw snake
	ctx!.fillStyle = "green";
	const snakeBody: Array<SnakeBody> = player.body;
	snakeBody.forEach((cell) => {
		if (cell.active === -1) ctx!.fillStyle = "gray";
		ctx?.fillRect(cell.pos.x, cell.pos.y, player.size, player.size);
	});
}

// Game loop
function gameTick() {
	gameDraw();

	// check food collisions
	let removeIdx = -1;
	for (let i = 0; i < foodArr.length; i++) {
		const curFood = foodArr[i];
		const snakeHead = player.getHead();
		if (
			collisionBoundingBox(
				{ x: snakeHead.x, y: snakeHead.y, w: player.size, h: player.size },
				{ x: curFood.x, y: curFood.y, w: BLOCK_SIZE, h: BLOCK_SIZE }
			)
		) {
			player.body.push(new SnakeBody(curFood.x, curFood.y, player.body.length));
			removeIdx = i;
			break;
		}
	}
	if (removeIdx !== -1) {
		foodArr.splice(removeIdx, 1);
		createFood();
	}

	player.checkCollisions();
	player.move();
}

for (let i = 0; i < 5; i++) {
	createFood();
}
setInterval(gameTick, Math.floor(1000 / MOVES_PER_SECOND));
