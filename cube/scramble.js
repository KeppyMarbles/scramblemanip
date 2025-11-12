import { Move } from "./move.js";

export class ScrambleOptimizer {
    static defaultCostConfiguration = {
        regrip: 10,
        double: 0,
        alpha: {
            "F": 0.5, "B": 3.5, "R": 0, "L": 2, "U": 0, "D": 2.5,
            "f": 1.5, "b": 4, "r": 0.5, "l": 2.5, "u": 1.5, "d": 3.5,
        },
        grip: {
            "F F": 0, "F U": 0, "F D": 0, "F Bd": 2.5, "F Bu": 2.5, 
            "U F": 0, "U U": 1, "U D": 0.5, "U Bd": 2.5, "U Bu": 2.5, 
            "D F": 0, "D U": 0.5, "D D": 1, "D Bd": 2.5, "D Bu": 2.5, 
            "Bd F": 2.5, "Bd U": 2.5, "Bd D": 2.5, "Bd Bd": 3.5, "Bd Bu": 3.5, 
            "Bu F": 2.5, "Bu U": 2.5, "Bu D": 2.5, "Bu Bd": 3.5, "Bu Bu": 3.5,
        },
        fingertrick: {
            "right_index": 0,
            "right_index_push": 1,
            "right_index_middle": 0,
            "right_ring": 1,
            "right_ring_middle": 1.5,
            "right_ring_push": 3,
            "right_up": 0,
            "right_up_double": 0,
            "right_down": 0,
            "right_down_double": 0,
            "left_index": 0,
            "left_index_push": 3,
            "left_index_middle": 0,
            "left_ring": 1,
            "left_ring_middle": 1.5,
            "left_ring_push": 3,
            "left_up": 0,
            "left_up_double": 0,
            "left_down": 0,
            "left_down_double": 0,
        }
    }   

    constructor(config, transitions, callback) {
        this.config = config;
        this.minScramble = scramble;
        this.minCost = Infinity;
        this.iterations = 0;
        this.distribution = null;
        this.callback = callback;
        this.transitions = transitions;
    }

    static wideReplace(moves, index, orientation) {
        moves[index].alpha = Move.WIDE_EQUIVALENTS[moves[index].alpha]
        moves[index].isWide = true;
        let rotation = Move.WIDE_ROTATIONS[moves[index].toKey()];
        for(let i = index+1; i < moves.length; i++) {
            moves[i].transpose(rotation);
        }
        orientation.up = Move.TRANSPOSITIONS[rotation][orientation.up];
        orientation.front = Move.TRANSPOSITIONS[rotation][orientation.front];
    }

    static primeReplace(moves, index, orientation) {
        moves[index].isPrime = true;
    }

    static wideReplaceDouble(moves, index, orientation) {
        const newMove = new Move(Move.WIDE_EQUIVALENTS[moves[index].alpha], moves[index].isPrime, false, false, true);
        moves[index].isDouble = false;
        moves.splice(index, 0, newMove);
        let rotation = Move.WIDE_ROTATIONS[moves[index].toKey()]
        for(let i = index+1; i < moves.length; i++) {
            moves[i].transpose(rotation);
        }
        orientation.up = Move.TRANSPOSITIONS[rotation][orientation.up];
        orientation.front = Move.TRANSPOSITIONS[rotation][orientation.front];
    }

    static copyScramble(moves) {
        return moves.map(move=>new Move(move.alpha, move.isPrime, move.isDouble, move.isRotation, move.isWide, move.sliceNum));
    }

    static parseScramble(string) {
        return string.split(" ").map(Move.fromString);
    }

    static getScrambleString(scramble) {
        return scramble.map(m => m.toString()).join(" ");
    }

    recordCost(cost) {
        const rounded = Math.round(cost * 2) / 2;
        this.distribution.set(rounded, (this.distribution.get(rounded) || 0) + 1);
    }

    getTransitionFor(grip, moveKey) { //TODO needed?
        return this.transitions[grip]?.[moveKey];
    }

    computeTransitionCost(transition, move) { //TODO should probably have a better prevention of NaNs
        let added = 0;
        if (!transition) return 999999;
        if (transition.regrip) added += this.config.regrip;
        added += this.config.grip[transition.next];
        added += this.config.fingertrick[transition.type];
        added += this.config.alpha[move.isWide ? move.alpha.toLowerCase() : move.alpha];
        if(move.isDouble) added += this.config.double;
        return added;
    }

    bruteforceOptimize(moves, index = 0, currentGrip = "start", currentCost = 0, orientation = {up: "U", front: "F"}) {
        if(this.memoize) {
            const key = `${index}|${currentGrip}|${orientation.up}${orientation.front}|${moves.length}`;
            //const key = `${index}|${currentGrip}|${orientation.up}${orientation.front}`;
            const oldBest = this.memo[key] ?? Infinity;
            if (this.memo[key]+this.depth <= currentCost) 
                return;
            this.memo[key] = currentCost;
        }

        // TODO maybe reset count if we're making progress?

        if (this.iterations > this.maxIterations) {
            return;
        }
        if(this.pruneRotations && currentCost > this.bestCost+this.depth) {
            return;
        }
        if(currentCost > this.minCost+this.depth) {
            return;
        }

        if (index >= moves.length) {
            if (currentCost < this.minCost) {
                this.minCost = currentCost;
                this.minScramble = ScrambleOptimizer.copyScramble(moves);
            }
            this.recordCost(currentCost);
            return;
        }

        function branchWithClone(inst, mutFn, skip = 1) {
            const clone = ScrambleOptimizer.copyScramble(moves);
            const newOrientation = {up: orientation.up, front: orientation.front};
            if(mutFn)
              mutFn(clone, index, newOrientation);

            let cost = currentCost;
            let grip = currentGrip;
            for(let i = 0; i < skip; i++) {
                const moved = clone[index+i];
                const movedKey = moved.toKey();
                const transition = inst.getTransitionFor(grip, movedKey);
                if (!transition) {
                    //console.error("invalid branch", currentGrip, movedKey);
                    return;
                }
                cost += inst.computeTransitionCost(transition, moved);
                grip = transition.next;
            }

            inst.bruteforceOptimize(clone, index + skip, grip, cost, newOrientation);
        }

        const move = moves[index];
        this.iterations++;

        branchWithClone(this, null, 1);

        if(move.isRotation)
            return;

        // wide variation (single-layer wide)
        if (!move.isWide) {
            branchWithClone(this, (arr, idx, or) => ScrambleOptimizer.wideReplace(arr, idx, or), 1);
        }

        // prime variation for double (turn R2 into R2' variant)
        if(move.isDouble) { 
            if (!move.isPrime) {
                branchWithClone(this, (arr, idx, or) => ScrambleOptimizer.primeReplace(arr, idx, or), 1);
            }
            // Combinations (prime + wide, prime + wideReplaceDouble, etc.)
            if (!move.isWide) {
                // prime + wide (prime then wideReplace)
                branchWithClone(this, (arr, idx, or) => { ScrambleOptimizer.primeReplace(arr, idx, or); ScrambleOptimizer.wideReplace(arr, idx, or); }, 1);

                if(this.doWideReplaceDouble) {
                    // wideReplaceDouble (change double move into 1 face move and 1 wide move)
                    // inserts an extra move at index (length increases) so skip=2
                    branchWithClone(this, (arr, idx, or) =>  ScrambleOptimizer.wideReplaceDouble(arr, idx, or), 2);
                    if(!move.isPrime)
                        branchWithClone(this, (arr, idx, or) => { ScrambleOptimizer.primeReplace(arr, idx, or); ScrambleOptimizer.wideReplaceDouble(arr, idx, or); }, 2);
                }
            }
        }
    }

    async optimize(options) {
        const top_rotations = ["", "x2", "x'", "x", "z", "z'"];
        const front_rotations = ["", "y", "y2", "y'"];

        this.depth = options.depth;
        this.maxIterations = options.maxIterations;

        this.bestRotation = {top: null, front: null};
        this.bestCost = Infinity;
        this.bestScramble = options.scramble;
        this.distribution = new Map();
        this.pruneRotations = options.pruneRotations;
        this.memoize = options.memoize;
        this.doWideReplaceDouble = options.wideReplaceDouble;
        this.rotationInfo = [];
        this.memo = new Map();

        const orientation = {up: "U", front: "F"};

        for (const top_rot of top_rotations) {
            for(const front_rot of front_rotations) {

                const rotatedScramble = ScrambleOptimizer.copyScramble(options.scramble);
                const newOrientation = {up: orientation.up, front: orientation.front};
                // transpose all moves according to the starting rotation
                if (top_rot !== "") {
                    for (const move of rotatedScramble) {
                        move.transpose(top_rot);
                    }
                    newOrientation.up = Move.TRANSPOSITIONS[top_rot][newOrientation.up];
                }
                if (front_rot !== "") {
                    for (const move of rotatedScramble) {
                        move.transpose(front_rot);
                    }
                    newOrientation.front = Move.TRANSPOSITIONS[front_rot][newOrientation.front];
                }

                this.minCost = Infinity;
                this.minScramble = scramble;
                this.iterations = 0;
            
                this.bruteforceOptimize(rotatedScramble, 0, "start", 0, newOrientation);

                this.rotationInfo.push({ // TODO know the max index that was reached?
                    rotation: {top: top_rot, front: front_rot}, 
                    cost: this.minCost, 
                    iterations: this.iterations,
                    maxed: this.iterations > this.maxIterations,
                });

                
                if (this.minCost < this.bestCost) {
                    this.bestCost = this.minCost;
                    this.bestScramble = ScrambleOptimizer.copyScramble(this.minScramble);
                    this.bestRotation = {top: top_rot, front: front_rot};
                }

                if(this.callback)
                    await this.callback();

                if(!options.searchRotations)
                    return;
            }
        }
    }
    
    analyze(scramble) {
        let totalCost = 0;
        let currentGrip = "start";
        const breakdown = [];

        for (let i = 0; i < scramble.length; i++) {
            const move = scramble[i];
            const moveKey = move.toKey();

            const transition = this.getTransitionFor(currentGrip, moveKey);
            if (!transition) {
                break;
            }

            const nextGrip = transition.next;
            const added = this.computeTransitionCost(transition, move);

            breakdown.push({
                move: move.toString(),
                transition,
                addedCost: added,
            });

            totalCost += added;
            currentGrip = nextGrip;
        }

        return breakdown;
    }

    analyzeBest() {
        return this.analyze(this.bestScramble);
    }

    getBestAsString() {
        if(!this.bestScramble)
            return "";
        const scramble = ScrambleOptimizer.copyScramble(this.bestScramble);
        if(this.bestRotation.front)
            scramble.unshift(Move.fromString(this.bestRotation.front));
        if(this.bestRotation.top)
            scramble.unshift(Move.fromString(this.bestRotation.top));

        return ScrambleOptimizer.getScrambleString(scramble);
    }
}