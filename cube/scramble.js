import { gripTransitions } from "./gripTransitions.js";
import { Move, WIDE_EQUIVALENTS, WIDE_ROTATIONS } from "./move.js";


function wideReplace(moves, index) {
    moves[index].alpha = WIDE_EQUIVALENTS[moves[index].alpha]
    moves[index].isWide = true;
    let rotation = WIDE_ROTATIONS[moves[index].toKey()];
    for(let i = index+1; i < moves.length; i++) {
        moves[i].transpose(rotation);
    }
}

function primeReplace(moves, index) {
    moves[index].isPrime = true;
}

function wideReplaceDouble(moves, index) {
    const newMove = new Move(WIDE_EQUIVALENTS[moves[index].alpha], moves[index].isPrime, false, false, true);
    moves[index].isDouble = false;
    moves.splice(index, 0, newMove);
    let rotation = WIDE_ROTATIONS[moves[index].toKey()]
    for(let i = index+1; i < moves.length; i++) {
        moves[i].transpose(rotation);
    }
}


function getTransitionFor(grip, moveKey) {
    return (gripTransitions[grip] && gripTransitions[grip][moveKey]);
}


const visited = new Map();
// Safe recursion: each variant branches on a cloned moves array.
function bruteforce_optimize(moves, index = 0, currentGrip = "start", currentCost = 0) {
    //const key = `${index}:${currentGrip}`;
    //const prev = visited.get(key);
    //if (prev !== undefined && prev <= currentCost) {
    //  return;
    //}
    //visited.set(key, currentCost);
    // base case
    if (index >= moves.length) {
        iterations++;
        if (currentCost < min_cost) {
            min_cost = currentCost;
            min_scramble = copyScramble(moves);
            //console.log("New best found:", currentCost, moves.map(m => m.toString()).join(" "));
        }
        if (currentCost === 0) zeros++;
        return;
    }

    const move = moves[index];
    const moveKey = move.toKey();
    const transition = getTransitionFor(currentGrip, moveKey);

    if (!transition) {
        // No valid transition defined; treat as costly and prune
        return;
    }

    const added = computeTransitionCost(transition, move);
    let newCost = currentCost + added;

    // Prune immediately if cost already worse than best.
    if (newCost > min_cost+depth) {
        return;
    }

    // --- Normal (no mutation) branch ---
    bruteforce_optimize(moves, index + 1, transition.next, newCost);

    function branchWithClone(mutFn, skip = 1) {
        const clone = copyScramble(moves);
        mutFn(clone, index); 
        // compute transition for clone[index] against the same currentGrip
        const moved = clone[index];
        const movedKey = moved.toKey();
        const t2 = getTransitionFor(currentGrip, movedKey);
        if (!t2) return; // invalid branch
        const added2 = computeTransitionCost(t2, moved);
        const newCost2 = currentCost + added2;
        if (newCost2 > min_cost+depth) return; // prune
        bruteforce_optimize(clone, index + skip, t2.next, newCost2);
    }

    // wide variation (single-layer wide)
    if (!move.isWide && !move.isRotation) {
        branchWithClone((arr, idx) => wideReplace(arr, idx), 1);
    }

    // prime variation for double (turn R2 into R' variant)
    if (move.isDouble && !move.isPrime && !move.isRotation) {
        branchWithClone((arr, idx) => primeReplace(arr, idx), 1);
    }

    // wideReplaceDouble (insert a new move equivalent for wide double)
    //f (move.isDouble && !move.isRotation) {
    //   // wideReplaceDouble inserts an extra move at index (length increases) so skip=2
    //   branchWithClone((arr, idx) => wideReplaceDouble(arr, idx), 2);
    //

    // Combinations (prime + wide, prime + wideReplaceDouble, etc.)
    if (move.isDouble && !move.isRotation && !move.isWide) {
        // prime + wide (prime then wideReplace)
        branchWithClone((arr, idx) => { primeReplace(arr, idx); wideReplace(arr, idx); }, 1);

        // prime + wideReplaceDouble
        //branchWithClone((arr, idx) => { primeReplace(arr, idx); wideReplaceDouble(arr, idx); }, 2);
    }
}

export function analyzeScramble(moves) {
    let totalCost = 0;
    let currentGrip = "start";
    const breakdown = [];

    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const moveKey = move.toKey();

        const transition = getTransitionFor(currentGrip, moveKey);
        if (!transition) {
            breakdown.push({
                move: move.toString(),
                grip: currentGrip,
                next: "(invalid)",
                transition: null,
                addedCost: 999999,
            });
            totalCost += 999999;
            break; // stop early if invalid
        }

        const nextGrip = transition.next;
        const added = computeTransitionCost(transition, move);
        //console.log("added", added)

        breakdown.push({
            move: move.toString(),
            grip: currentGrip,
            next: nextGrip,
            transition,
            addedCost: added,
        });

        totalCost += added;
        currentGrip = nextGrip;
    }

    return { totalCost, breakdown };
}

function copyScramble(moves) {
    return moves.map(move=>new Move(move.alpha, move.isPrime, move.isDouble, move.isRotation, move.isWide, move.sliceNum));
}

export function getScramble(string) {
    return string.split(" ").map(Move.fromString);
}


export function optimizeScramble(baseScramble, newConfig, newDepth) {
    const top_rotations = ["", "x2", "x'", "x", "z", "z'"];
    const front_rotations = ["", "y", "y2", "y'"];

    config = newConfig;
    console.log(config);
    depth = newDepth;
    let bestRotation = null;
    let bestCost = Infinity;
    let bestScramble = baseScramble;

    // TODO move this into bruteforce so that we can prune early
    for (const top_rot of top_rotations) {
        for(const front_rot of front_rotations) {
            const rotatedScramble = copyScramble(baseScramble);
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

            min_cost = Infinity;
            min_scramble = baseScramble;
            iterations = 0;
            //zeros = 0;

            bruteforce_optimize(rotatedScramble);

            console.log(`Rotation ${top_rot} ${front_rot}: cost=${min_cost}`);
            console.log("Iterations:", iterations);

            if (min_cost < bestCost) {
                bestCost = min_cost;
                bestScramble = copyScramble(min_scramble);
                bestRotation = {top: top_rot, front: front_rot};
            }
        }

    }

    console.log(`Best rotation: ${bestRotation.top} ${bestRotation.front} with cost=${bestCost}`);
    
    return { bestRotation, bestScramble, bestCost };
}


function computeTransitionCost(transition, move) { //TODO should probably have a better prevention of NaNs
    let added = 0;
    if (!transition) return 999999;
    if (transition.regrip) added += config.regrip;
    added += config.grip[transition.next];
    added += config.fingertrick[transition.type];
    added += config.alpha[move.alpha];
    if(move.isWide) added += config.wide;
    if(move.isDouble) added += config.double;
    return added;
}

var config;
var depth = 0;

var min_scramble;
var min_cost = 9999;
var iterations = 0;
var zeros = 0;
