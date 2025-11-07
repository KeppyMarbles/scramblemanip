import { setupCostForm } from "./ui/form.js";
import { defaultCostConfiguration } from "./cube/costConfig.js";
import { getScramble, optimizeScramble, analyzeScramble } from "./cube/scramble.js";

function onSubmit(newConfig) {
    
    document.getElementById("breakdown").value = "";
    const scramble = getScramble(document.getElementById("scramble").value);
    const depth = parseFloat(document.getElementById("depth").value);
    console.time("optimizeTimer");
    const result = optimizeScramble(scramble, newConfig, depth);
    console.timeEnd("optimizeTimer");
    console.log(result);
    const { totalCost, breakdown } = analyzeScramble(result.bestScramble);

    console.log("Total cost:", totalCost);
    console.table(
        breakdown.map(b => ({
        Move: "   "+b.move+"   ",
        From: b.grip,
        To: b.next,
        Cost: b.addedCost,
        Type: b.transition?.type || "(none)"
        }))
    );

    document.getElementById("breakdown").value = result.bestScramble.map(m => m.toString()).join(" ");

    //msg = "";
    //for(const step of breakdown) {
    //    
    //}
}

setupCostForm(defaultCostConfiguration, onSubmit);