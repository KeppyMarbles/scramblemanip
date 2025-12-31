import { setupForm, drawSearchTime } from "./ui/form.js";
import { ScrambleOptimizer } from "./cube/scramble.js";
import { drawOptimizerStats } from "./ui/stats.js";
import gripTransitions from './gripTransitions.json' with { type: 'json' };
/** @import { CostConfig, RunOptions } from "../types.js" */

/**
 * Called when submit scramble button is pressed
 * @param {CostConfig} config
 * @param {RunOptions} options 
 */
async function onSubmit(config, options) {
    await drawOptimizerStats(null);

    const optimizer = new ScrambleOptimizer(config, gripTransitions, async () => {
        await drawOptimizerStats(optimizer);
    });

    const start = performance.now();
    await optimizer.optimize(options);
    const end = performance.now();

    drawSearchTime(end - start);
}

setupForm(onSubmit);