export function setupCostForm(initialConfig, onUpdate) {
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

        onUpdate(newConfig);
    });
}