import { ScrambleOptimizer } from "../cube/scramble.js";

export function setupForm(initialConfig, onSubmit) {
    const form = document.getElementById("costForm");

    // Generate nested fields dynamically
    for (const [groupName, groupValue] of Object.entries(initialConfig)) {
        const groupDiv = form.querySelector(`[data-group="${groupName}"]`);
        if (!groupDiv || typeof groupValue !== "object") continue;
        
        for (const [key, val] of Object.entries(groupValue)) {
            const label = document.createElement("label");
            label.textContent = key;
            const input = document.createElement("input");
            input.type = "number";
            input.step = "0.5";
            input.name = `${groupName}.${key}`;
            input.value = val;
            label.appendChild(input);
            groupDiv.appendChild(label);
        }
    }

    // Populate top-level (regrip, wide, double)
    for (const [key, value] of Object.entries(initialConfig)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
    }

    // Submit handler
    document.getElementById("submitButton").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("errorMessage").textContent = "";
        try {
            const config = collectCostConfig(form, initialConfig);
            const options = collectRunOptions();
            onSubmit({ config, options });
        } 
        catch (err) {
            document.getElementById("errorMessage").textContent = "Error: " + err.message;
        }
    });

    document.getElementById("resetButton").addEventListener("click", (e) => {
        applyConfig(form, initialConfig);
    });
}

function collectCostConfig(form, initialConfig) {
  const newConfig = structuredClone(initialConfig);
  const formData = new FormData(form);

  for (const [fullKey, val] of formData.entries()) {
    const num = parseFloat(val);
    if (fullKey.includes(".")) {
      const [group, subkey] = fullKey.split(".");
      newConfig[group][subkey] = num;
    } 
    else {
      newConfig[fullKey] = num;
    }
  }

  return newConfig;
}

function collectRunOptions() {
  const scramble = ScrambleOptimizer.parseScramble(document.getElementById("scramble").value.trim());
  const depth = parseFloat(document.getElementById("depth").value);
  const iterations = parseFloat(document.getElementById("iterations").value);
  const pruneRotations = document.getElementById("pruneRotations").checked;
  const memoize = document.getElementById("memoize").checked;

  if (Number.isNaN(depth) || Number.isNaN(iterations)) {
    throw new Error("Depth and iterations must be numbers");
  }

  return { scramble, depth, iterations, pruneRotations, memoize };
}

function applyConfig(form, config) {
  for (const [groupName, groupValue] of Object.entries(config)) {
    if (typeof groupValue === "object") {
      for (const [key, val] of Object.entries(groupValue)) {
        const input = form.querySelector(`[name="${groupName}.${key}"]`);
        if (input) input.value = val;
      }
    } else {
      const input = form.querySelector(`[name="${groupName}"]`);
      if (input) input.value = groupValue;
    }
  }
}