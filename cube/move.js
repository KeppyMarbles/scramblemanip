export const WIDE_EQUIVALENTS = {
  R: 'L',
  L: 'R',
  U: 'D',
  D: 'U',
  F: 'B',
  B: 'F'
};

export const WIDE_ROTATIONS = {
  "R": "x",  "R'": "x'", "R2": "x2",  "R2'": "x2'",
  "L": "x'", "L'": "x",  "L2": "x2'", "L2'": "x2",
  "U": "y",  "U'": "y'", "U2": "y2",  "U2'": "y2'",
  "D": "y'", "D'": "y",  "D2": "y2'", "D2'": "y2",
  "F": "z",  "F'": "z'", "F2": "z2",  "F2'": "z2'",
  "B": "z'", "B'": "z",  "B2": "z2'", "B2'": "z2",
};

export const TRANSPOSITIONS = { //TODO rotations?
    "x":   { "R": "R", "L": "L", "U": "B", "B": "D", "D": "F", "F": "U" },
    "x'":  { "R": "R", "L": "L", "U": "F", "B": "U", "D": "B", "F": "D" },
    "x2":  { "R": "R", "L": "L", "U": "D", "B": "F", "D": "U", "F": "B" },
    "x2'": { "R": "R", "L": "L", "U": "D", "B": "F", "D": "U", "F": "B" },
    "y":   { "R": "F", "L": "B", "U": "U", "B": "R", "D": "D", "F": "L" },
    "y'":  { "R": "B", "L": "F", "U": "U", "B": "L", "D": "D", "F": "R" },
    "y2":  { "R": "L", "L": "R", "U": "U", "B": "F", "D": "D", "F": "B" },
    "y2'": { "R": "L", "L": "R", "U": "U", "B": "F", "D": "D", "F": "B" },
    "z":   { "R": "D", "L": "U", "U": "R", "B": "B", "D": "L", "F": "F" },
    "z'":  { "R": "U", "L": "D", "U": "L", "B": "B", "D": "R", "F": "F" },
    "z2":  { "R": "L", "L": "R", "U": "D", "B": "B", "D": "U", "F": "F" },
    "z2'": { "R": "L", "L": "R", "U": "D", "B": "B", "D": "U", "F": "F" },
}

const MOVE_LIST = ["R", "L", "U", "D", "F", "B"];
const ROTATION_LIST = ["x", "y", "z"];

export class Move {
    constructor(alpha, isPrime, isDouble, isRotation, isWide, sliceNum) {
        this.alpha = alpha;
        this.isPrime = isPrime;
        this.isDouble = isDouble;
        this.isWide = isWide;
        this.isRotation = isRotation;
        this.sliceNum = sliceNum;
    }

    static fromString(moveStr) {
        const move = new Move();
        let index = 0;
        const length = moveStr.length;

        if (length === 0) 
            throw new SyntaxError("Empty move string");

        let char = moveStr[index];

        // Optional numeric prefix (e.g. "3Rw")
        if (/\d/.test(char)) {
            move.sliceNum = parseInt(char);
            index++;
            if (index === length) {
                throw new SyntaxError(`Char '${char}' at index ${index}: expected a letter`);
            }
            char = moveStr[index];
        }

        // Face or rotation
        if (MOVE_LIST.includes(char.toUpperCase())) {
            move.alpha = char.toUpperCase();
            move.isWide = char === char.toLowerCase(); // lowercase = wide move
        } 
        else if (ROTATION_LIST.includes(char)) {
            move.alpha = char;
            move.isRotation = true;
        } 
        else {
            throw new SyntaxError(`Char '${char}' at index ${index}: unknown move type`);
        }

        index++;
        if (index === length) 
            return move;

        char = moveStr[index];

        // Optional 'w' modifier (e.g. "Rw", "3Rw")
        if (char === "w") {
            if (!move.sliceNum) 
                move.sliceNum = 2; // standard wide move means 2 slices
            index++;
            if (index === length) 
                return move;
            char = moveStr[index];
        }

        // Optional '2' (double turn)
        if (char === "2") {
            move.isDouble = true;
            index++;
            if (index === length) 
                return move;
            char = moveStr[index];
        }

        // Optional "'" (prime)
        if (char === "'") {
            move.isPrime = true;
            index++;
            if (index < length) {
                throw new SyntaxError(`Extra characters after prime: '${moveStr.slice(index)}'`);
            }
        } 
        else if (index < length) {
            throw new SyntaxError(`Char '${char}' at index ${index}: unknown modifier`);
        }

        return move;
    }

    toString() {
        let s = "";
        if (this.sliceNum > 2) s += this.sliceNum;
        s += (this.isWide || this.isRotation) ? this.alpha.toLowerCase() : this.alpha;
        if (this.sliceNum > 1) s += "w";
        if (this.isDouble) s += "2";
        if (this.isPrime) s += "'";
        return s;
    }

    toKey() {
        let s = this.alpha;
        if (this.isDouble) s += "2";
        if (this.isPrime) s += "'";
        return s;
    }

    transpose(string) {
        this.alpha = TRANSPOSITIONS[string][this.alpha];
    }


}