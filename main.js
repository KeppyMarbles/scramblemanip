import { setupForm, drawSearchTime } from "./ui/form.js";
import { ScrambleOptimizer } from "./cube/scramble.js";
import { drawOptimizerStats } from "./ui/stats.js";
import gripTransitions from './gripTransitions.json' with { type: 'json' };

var optimizer;

async function onSubmit({ config, options }) {
    await drawOptimizerStats(null);

    optimizer = new ScrambleOptimizer(config, gripTransitions, onRotationDone);

    const start = performance.now();
    await optimizer.optimize(options);
    const end = performance.now();

    drawSearchTime(end - start);
}

async function onRotationDone() {
  await drawOptimizerStats(optimizer);
}

setupForm(onSubmit);