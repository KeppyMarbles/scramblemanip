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

    static wideReplace(moves, index) {
        moves[index].alpha = Move.WIDE_EQUIVALENTS[moves[index].alpha]
        moves[index].isWide = true;
        let rotation = Move.WIDE_ROTATIONS[moves[index].toKey()];
        for(let i = index+1; i < moves.length; i++) {
            moves[i].transpose(rotation);
        }
    }

    static primeReplace(moves, index) {
        moves[index].isPrime = true;
    }

    static wideReplaceDouble(moves, index) {
        const newMove = new Move(Move.WIDE_EQUIVALENTS[moves[index].alpha], moves[index].isPrime, false, false, true);
        moves[index].isDouble = false;
        moves.splice(index, 0, newMove);
        let rotation = Move.WIDE_ROTATIONS[moves[index].toKey()]
        for(let i = index+1; i < moves.length; i++) {
            moves[i].transpose(rotation);
        }
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

    bruteforceOptimize(moves, index = 0, currentGrip = "start", currentCost = 0) {

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
            if(mutFn)
              mutFn(clone, index);

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

            inst.bruteforceOptimize(clone, index + skip, grip, cost);
        }

        const move = moves[index];
        this.iterations++;

        branchWithClone(this, null);

        // wide variation (single-layer wide)
        if (!move.isWide && !move.isRotation) {
            branchWithClone(this, (arr, idx) => ScrambleOptimizer.wideReplace(arr, idx), 1);
        }

        // prime variation for double (turn R2 into R' variant)
        if (move.isDouble && !move.isPrime && !move.isRotation) {
            branchWithClone(this, (arr, idx) => ScrambleOptimizer.primeReplace(arr, idx), 1);
        }

         //wideReplaceDouble (insert a new move equivalent for wide double)
        if (move.isDouble && !move.isRotation) {
           // wideReplaceDouble inserts an extra move at index (length increases) so skip=2
           branchWithClone(this, (arr, idx) =>  ScrambleOptimizer.wideReplaceDouble(arr, idx), 2);
        }

        // Combinations (prime + wide, prime + wideReplaceDouble, etc.)
        if (move.isDouble && !move.isRotation && !move.isWide) {
            // prime + wide (prime then wideReplace)
            branchWithClone(this, (arr, idx) => { ScrambleOptimizer.primeReplace(arr, idx); ScrambleOptimizer.wideReplace(arr, idx); }, 1);

            // prime + wideReplaceDouble
            if(!move.isPrime)
                branchWithClone(this, (arr, idx) => { ScrambleOptimizer.primeReplace(arr, idx); ScrambleOptimizer.wideReplaceDouble(arr, idx); }, 2);
        }
    }

    async optimize(scramble, depth, maxIterations, pruneRotations) {
        const top_rotations = ["", "x2", "x'", "x", "z", "z'"];
        const front_rotations = ["", "y", "y2", "y'"];

        this.depth = depth;
        this.maxIterations = maxIterations;

        this.bestRotation = {top: null, front: null};
        this.bestCost = Infinity;
        this.bestScramble = scramble;
        this.distribution = new Map();
        this.pruneRotations = pruneRotations;
        this.rotationInfo = [];

        for (const top_rot of top_rotations) {
            for(const front_rot of front_rotations) {

                const rotatedScramble = ScrambleOptimizer.copyScramble(scramble);
                // transpose all moves according to the starting rotation
                if (top_rot !== "") {
                    for (const move of rotatedScramble) {
                        move.transpose(top_rot);
                    }
                }
                if (front_rot !== "") {
                    for (const move of rotatedScramble) {
                        move.transpose(front_rot);
                    }
                }

                this.minCost = Infinity;
                this.minScramble = scramble;
                this.iterations = 0;

                this.bruteforceOptimize(rotatedScramble);

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