import { setupForm } from "./ui/form.js";
import { ScrambleOptimizer } from "./cube/scramble.js";
import { drawOptimizerStats } from "./ui/stats.js";
import gripTransitions from './gripTransitions.json' with { type: 'json' };

var optimizer;

async function onSubmit({ config, options }) {
    saveCostConfig(config);

    await drawOptimizerStats(null);

    optimizer = new ScrambleOptimizer(config, gripTransitions, onRotationDone);

    console.time("optimizeTimer");
    await optimizer.optimize(options.scramble, options.depth, options.iterations, options.pruneRotations, options.memoize);
    console.timeEnd("optimizeTimer");
}

async function onRotationDone() {
  await drawOptimizerStats(optimizer);
}

function loadCostConfig() {
  try {
    const stored = localStorage.getItem("costConfig");
    return stored ? JSON.parse(stored) : null;
  } 
  catch {
    return null;
  }
}

function saveCostConfig(config) {
  localStorage.setItem("costConfig", JSON.stringify(config));
}

setupForm(loadCostConfig() || ScrambleOptimizer.defaultCostConfiguration, onSubmit);