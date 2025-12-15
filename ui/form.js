import { ScrambleOptimizer } from "../cube/scramble.js";
import { costToColor } from "./stats.js";

export function setupForm(onSubmit) {
    let initialConfig = loadCostConfig();
    if(initialConfig)
      initialConfig = migrateConfig(initialConfig, ScrambleOptimizer.defaultCostConfiguration);
    else
      initialConfig = ScrambleOptimizer.defaultCostConfiguration;

    const form = document.getElementById("costForm");

    {
        const formAlias = {
          "regrip": "Regrip",
          "double": "Double Move",
          "repeatPenalty": "Repeat Fingertrick",
          "wideMultiplier": "Wide Fingertrick Multiplier"
        }

        const formTitles = {
          "double": "Only effective if Wide Replace Double is active",
          "repeatPenalty": "The cost of doing the same fingertrick twice in a row",
          "wideMultiplier": "How much the fingertrick cost should be scaled if it's a wide move"
        }

        const formTypes = {
          "wideMultiplier": "scalar"
        }
      
        for (const [groupName, groupValue] of Object.entries(initialConfig)) {
            const groupDiv = form.querySelector(`[data-group="${groupName}"]`);
            if (!groupDiv || typeof groupValue !== "object") continue;

            for (const [key, val] of Object.entries(groupValue)) {
                const label = document.createElement("label");
                label.textContent = formAlias[key] || key;
                label.title = formTitles[key] || "";
                const input = document.createElement("input");
                input.type = "number";
                input.step = "0.5";
                input.name = `${groupName}.${key}`;
                input.value = val;
                input.valueType = formTypes[key] || "additive";
                //input.colorShift = formShifts[key] || -2;
                label.appendChild(input);
                groupDiv.appendChild(label);
            }
        }
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

    document.getElementById("saveButton").addEventListener("click", (e) => {
        saveCostConfig(collectCostConfig(form, initialConfig));
    });
    document.getElementById("resetSavedButton").addEventListener("click", (e) => {
        applyConfig(form, initialConfig);
    });
    document.getElementById("resetDefaultButton").addEventListener("click", (e) => {
        applyConfig(form, ScrambleOptimizer.defaultCostConfiguration);
    });

    addDropdown(document.getElementById("toggleAdvanced"), document.getElementById("advancedContent"), "Advanced Settings");
    addDropdown(document.getElementById("toggleConfig"), document.getElementById("configOptions"), "Config Options");

    document.querySelectorAll('.tab-buttons button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-buttons button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    addGroupControls(form, "fingertrick", [
        { label: "Pushes", targets: ["right_index_push", "right_ring_push", "left_index_push", "left_ring_push"]},
        { label: "Ring Finger", targets: ["right_ring", "right_ring_middle", "right_ring_push", "left_ring", "left_ring_middle", "left_ring_push"]},
        { label: "Index Finger", targets: ["right_index", "right_index_push", "right_index_middle", "left_index", "left_index_middle"]},
        { label: "Twist Up", targets: ["right_up", "right_up_double", "left_up", "left_up_double"]},
        { label: "Twist Down", targets: ["right_down", "right_down_double", "left_down", "left_down_double"]},
        { label: ""},
        { label: "Right Hand", targets: ["right_index", "right_index_push", "right_index_middle", "right_ring", "right_ring_middle", "right_ring_push", "right_up", "right_up_double", "right_down", "right_down_double"]},
        { label: "Left Hand", targets: ["left_index", "left_index_push", "left_index_middle", "left_ring", "left_ring_middle", "left_ring_push", "left_up", "left_up_double", "left_down", "left_down_double"]},
    ]);

    addGroupControls(form, "grip", [
        { label: "Left Thumb Front", targets: ["F F", "F U", "F D", "F Bu", "F Bd"]},
        { label: "Left Thumb Up", targets: ["U F", "U U", "U D", "U Bu", "U Bd"]},
        { label: "Left Thumb Down", targets: ["D F", "D U", "D D", "D Bu", "D Bd"]},
        { label: "Left Thumb Back", targets: ["Bu F", "Bu U", "Bu D", "Bu Bu", "Bu Bd", "Bd F", "Bd U", "Bd D", "Bd Bu", "Bd Bd"]},
        { label: ""},
        { label: "Right Thumb Front", targets: ["F F", "U F", "D F", "Bu F", "Bd F"]},
        { label: "Right Thumb Up", targets: ["F U", "U U", "D U", "Bu U", "Bd U"]},
        { label: "Right Thumb Down", targets: ["F D", "U D", "D D", "Bu D", "Bd D"]},
        { label: "Right Thumb Back", targets: ["F Bu", "U Bu", "D Bu", "Bu Bu", "Bd Bu", "F Bd", "U Bd", "D Bd", "Bu Bd", "Bd Bd"]},
        { label: ""},
        { label: "Both Up or Down", targets: ["U U", "D D"]},
        { label: "Both Back", targets: ["Bd Bd", "Bu Bu", "Bd Bu", "Bu Bd"]},
    ]);

    addGroupControls(form, "alpha", [
        { label: "Front", targets: ["F", "f"]},
        { label: "Back", targets: ["B", "b"]},
        { label: "Right", targets: ["R", "r"]},
        { label: "Left", targets: ["L", "l"]},
        { label: "Up", targets: ["U", "u"]},
        { label: "Down", targets: ["D", "d"]},
        { label: ""},
        { label: "Normal", targets: ["F", "B", "R", "L", "U", "D"]},
        { label: "Wide", targets: ["f", "b", "r", "l", "u", "d"]},
    ]);

    document.getElementById("exportButton").addEventListener("click", () => {
        try {
            const config = collectCostConfig(form, initialConfig);
            const json = JSON.stringify(config, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "scramble-config.json";
            a.click();
            URL.revokeObjectURL(url);
        } 
        catch (err) {
            alert("Error exporting configuration: " + err.message);
        }
    });
    
    const importFile = document.getElementById("importFile");

    document.getElementById("importButton").addEventListener("click", () => {
        importFile.click();
    });

    importFile.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const config = JSON.parse(text);
            applyConfig(document.getElementById("costForm"), config);
        } 
        catch (err) {
            alert("Error importing configuration: " + err.message);
        }

        importFile.value = "";
    });

    form.addEventListener("input", (e) => {
        if (e.target.matches('input[type="number"]')) {
            updateCostInputColors(form);
        }
    });

    updateCostInputColors(form);

}

function migrateConfig(imported, defaults) {
    const output = structuredClone(defaults);
    for (const [key, value] of Object.entries(imported)) {
        if (key in defaults) {
            if (typeof value === "object") {
                for (const [sub, subVal] of Object.entries(value)) {
                    if (sub in defaults[key]) {
                        output[key][sub] = subVal;
                    }
                }
            } 
            else {
                output[key] = value;
            }
        }
    }
    return output;
}

function addDropdown(btn, content, name) {
    btn.addEventListener("click", () => {
        const isHidden = content.classList.toggle("hidden");
        btn.textContent = isHidden
          ? name + " ▸"
          : name + " ▾";
    });
}

function addGroupControls(form, groupName, controls) {
    const groupDiv = document.querySelector(`[data-group="${groupName}"]`);
    if (!groupDiv) return;

    // Add a visual separator
    const separator = document.createElement("hr");
    separator.className = "group-separator";
    groupDiv.appendChild(separator);

    // Create a section header
    const header = document.createElement("p");
    header.textContent = "Adjustments";
    groupDiv.appendChild(header);

    // Create controls
    for (const ctrl of controls) {


        const div = document.createElement("div");
        div.style = "text-align: right;";

        const wrapper = document.createElement("label");
        wrapper.textContent = ctrl.label + " ";

        wrapper.appendChild(div);
        groupDiv.appendChild(wrapper);

        if(ctrl.label == "") {
            div.appendChild(document.createElement("p"))
            continue;
        }

        const minus = document.createElement("button");
        minus.type = "button";
        minus.textContent = "−";
        minus.dataset.group = groupName;
        minus.dataset.delta = -0.5;

        const plus = document.createElement("button");
        plus.type = "button";
        plus.textContent = "+";
        plus.dataset.group = groupName;
        plus.dataset.delta = 0.5;

        div.appendChild(minus);
        div.appendChild(plus);


        for(const btn of [minus, plus]) {
            btn.addEventListener('click', () => {
                const delta = parseFloat(btn.dataset.delta);
                const inputs = form.querySelectorAll(`[name^="${groupName}."]`);
                inputs.forEach(input => {
                    if(ctrl.targets.includes(input.name.split(".")[1])) {
                        const oldVal = parseFloat(input.value) || 0;
                        input.value = (oldVal + delta)
                    }
                })
                updateCostInputColors(form);
            })
        }
    }

    const zeroButton = document.createElement("button");
    zeroButton.textContent = "Zero All";
    zeroButton.type = "button";
    groupDiv.appendChild(zeroButton);

    zeroButton.addEventListener('click', () => {
        const inputs = form.querySelectorAll(`[name^="${groupName}."]`);
        inputs.forEach(input => {
            input.value = 0;
        });
        updateCostInputColors(form);
    });
}

function updateCostInputColors(form) {
    const inputs = form.querySelectorAll('input[type="number"]');

    inputs.forEach(input => {
          const val = parseFloat(input.value);
          if(input.valueType == "additive")
            input.style.backgroundColor = costToColor(val, 5, -2);
          else if(input.valueType == "scalar")
            input.style.backgroundColor = costToColor(val, 3, -2);
    });
}

function saveCostConfig(config) {
  localStorage.setItem("costConfig", JSON.stringify(config));
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
  const maxIterations = parseFloat(document.getElementById("iterations").value);
  const searchRotations = document.getElementById("searchRotations").checked;
  const pruneRotations = document.getElementById("pruneRotations").checked;
  const memoize = document.getElementById("memoize").checked;
  const wideReplaceDouble = document.getElementById("wideReplaceDouble").checked;

  if (Number.isNaN(depth) || Number.isNaN(maxIterations)) {
    throw new Error("Depth and iterations must be numbers");
  }
  for(const move of scramble) {
    if(move.isRotation)
        throw new Error("Rotations not supported yet");
  }

  return { scramble, depth, maxIterations, searchRotations, pruneRotations, memoize, wideReplaceDouble };
}

function applyConfig(form, config) {
  for (const [groupName, groupValue] of Object.entries(config)) {
    if (typeof groupValue === "object") {
      for (const [key, val] of Object.entries(groupValue)) {
        const input = form.querySelector(`[name="${groupName}.${key}"]`);
        if (input) input.value = val;
      }
    } 
    else {
      const input = form.querySelector(`[name="${groupName}"]`);
      if (input) input.value = groupValue;
    }
  }
  updateCostInputColors(form);
}

export function drawSearchTime(time) {
    document.getElementById("searchTime").textContent = new Date(time).toISOString().slice(11, -1)
}