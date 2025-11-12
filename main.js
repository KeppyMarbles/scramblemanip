import { setupForm } from "./ui/form.js";
import { ScrambleOptimizer } from "./cube/scramble.js";
import { drawOptimizerStats } from "./ui/stats.js";
import gripTransitions from './gripTransitions.json' with { type: 'json' };

var optimizer;

async function onSubmit({ config, options }) {
    await drawOptimizerStats(null);

    optimizer = new ScrambleOptimizer(config, gripTransitions, onRotationDone);

    console.time("optimizeTimer");
    await optimizer.optimize(options);
    console.timeEnd("optimizeTimer");
}

async function onRotationDone() {
  await drawOptimizerStats(optimizer);
}

setupForm(onSubmit);