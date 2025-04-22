const BLOCK_SIZE = 25;

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
	if (r1.x + r1.w >= r2.x && r1.x <= r2.x + r2.w && r1.y + r1.h >= r2.y && r1.y <= r2.y + r2.h) {
		return true;
	}
	return false;
}

class Snake {
	direction: Direction;
	body: Array<Point>;
	size: number;
	speed: number;

	constructor(x: number, y: number) {
		this.direction = Direction.None;
		this.body = [];
		this.size = BLOCK_SIZE;
		this.speed = BLOCK_SIZE;

		this.body.push(new Point(x, y));
	}

	checkCollisions = (): boolean => {
		const head = this.body[0];
		// Don't need to check self collisions if snake length < 4
		for (let i = 3; i < this.body.length; i++) {
			const rect1 = { x: head.x, y: head.y, w: this.size, h: this.size };
			const rect2 = {
				x: this.body[i].x,
				y: this.body[i].y,
				w: this.size,
				h: this.size,
			};
			if (collisionBoundingBox(rect1, rect2)) return true;
		}
		return false;
	};

	snakeDeath = (): void => {};

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
		// Loop from tail to head, moving each piece to the one ahead of it
		for (let i = this.body.length - 1; i > 0; i--) {
			this.body[i] = this.body[i - 1];
		}
		// Move snake head
		switch (this.direction) {
			case Direction.Up:
				this.body[0].y -= this.speed;
				break;
			case Direction.Right:
				this.body[0].x += this.speed;
				break;
			case Direction.Down:
				this.body[0].y += this.speed;
				break;
			case Direction.Left:
				this.body[0].x -= this.speed;
				break;
		}
	};
}

class food {
	pos: Point;
	color: string;

	constructor(x: number, y: number) {
		this.pos = new Point(x, y);
		this.color = "red";
	}
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
	const snakeBody: Array<Point> = player.body;
	snakeBody.forEach((cell) => {
		if (cell.toStr() in possible_pts) {
			delete possible_pts[cell.toStr()];
		}
	});

	// Remove overlapping points with Food (in-case you want multiple food on map)
	foodArr.forEach((cell) => {
		if (cell.toStr() in possible_pts) {
			delete possible_pts[cell.toStr()];
		}
	});

	let possible_pts_arr: string[] = Object.keys(possible_pts);
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
	// draw snake
	ctx!.fillStyle = "green";
	const snakeBody: Array<Point> = player.body;
	snakeBody.forEach((cell) => {
		ctx?.fillRect(cell.x, cell.y, player.size, player.size);
	});
	// draw food
	ctx!.fillStyle = "red";
	foodArr.forEach((cell) => {
		ctx?.fillRect(cell.x, cell.y, BLOCK_SIZE, BLOCK_SIZE);
	});
}

// Game loop
function gameLoop() {
	gameDraw();
	player.checkCollisions();
	player.move();
}

createFood();
setInterval(gameLoop, 150);

// TODO: Add snake eat food
// Snake death on self / out of screen
