import { setupCostForm } from "./ui/form.js";
import { ScrambleOptimizer } from "./cube/scramble.js";

var optimizer;

async function onSubmit(newConfig) {
    // TODO catch syntax errors
    const scramble = ScrambleOptimizer.getScramble(document.getElementById("scramble").value);

    const depth = parseFloat(document.getElementById("depth").value);
    const iterations = parseFloat(document.getElementById("iterations").value);
    const pruneRotations = document.getElementById("pruneRotations").checked;

    await clearCharts();

    optimizer = new ScrambleOptimizer(newConfig, onRotationDone);

    console.time("optimizeTimer");
    await optimizer.optimize(scramble, depth, iterations, pruneRotations);
    console.timeEnd("optimizeTimer");

}

async function clearCharts() {
  updateChart([]);
  renderRotationInfoTable([]);
  renderCostTable([]);
  document.getElementById("output").value = "";
  await new Promise(requestAnimationFrame);
}

async function onRotationDone() {
  updateChart(optimizer.distribution);
  renderRotationInfoTable(optimizer.rotationInfo);
  document.getElementById("output").value = optimizer.getBestAsString();
  renderCostTable(optimizer.analyzeBest());
  await new Promise(requestAnimationFrame);
}

function updateChart(distribution) {
    const costs = Array.from(distribution.keys()).sort((a, b) => a - b);
    const counts = costs.map(c => distribution.get(c));
    const data = [{
        x: costs,
        y: counts,
        type: 'bar',
    }];
    const layout = {
        margin: {
          l: 50, // left margin in pixels
          r: 50, // right margin in pixels
          b: 50, // bottom margin in pixels
          t: 10, // top margin in pixels
          pad: 4 // padding between the plot and the margin in pixels
        },
        xaxis: {
            title: "Scrambles Found",
        },
        yaxis: {
            title: "Scramble Cost"
        }
    };

    const samples =  Array.from(distribution.values()).reduce((a, b) => a + b, 0);
    const mean =     Array.from(distribution.entries()).reduce((sum, [cost, count]) => sum + cost * count, 0) / samples;
    const variance = Array.from(distribution.entries()).reduce((sum, [cost, count]) => sum + count * Math.pow(cost - mean, 2), 0) / samples;
    const stdDev = Math.sqrt(variance);
    const skewness = Array.from(distribution.entries()).reduce((sum, [cost, count]) => sum + count * Math.pow((cost - mean) / stdDev, 3), 0) / samples;

    const minCost = Math.min(...distribution.keys());
    const zScore = (minCost - mean) / stdDev;

    Plotly.newPlot(document.getElementById("myChart"), data, layout);
    document.getElementById("samples").textContent = samples;
    document.getElementById("averageCost").textContent = mean.toFixed(3);
    document.getElementById("standardDeviation").textContent = stdDev.toFixed(3);
    document.getElementById("skewness").textContent = skewness.toFixed(3);
    document.getElementById("minZ").textContent = zScore.toFixed(3);
}

function costToColor(cost, maxAbsCost, shift) {
  cost += shift;
  const ratio = Math.max(-1, Math.min(1, cost / maxAbsCost));
  const hue = 60 - ratio * 60;
  return `hsl(${hue}, 100%, 65%)`;
}

function renderCostTable(breakdowns) {
  
  const tbody = document.querySelector("#costTable tbody");
  tbody.innerHTML = "";

  let total = 0;
  for (const row of breakdowns) {
    total += row.addedCost;
    const tr = document.createElement("tr");
    const color = costToColor(row.addedCost, 5, -2);
    tr.innerHTML = `
      <td>${row.move}</td>
      <td>${row.transition?.next || "(none)"}</td>
      <td>${row.transition?.type || "(none)"}</td>
      
      <td style="background:${color};text-align:right">${row.addedCost}</td>
    `;
    tbody.appendChild(tr);
  }

  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `<td colspan="2"><b>Total</b></td><td><b>${total}</b></td>`;
  tbody.appendChild(totalRow);
}

function renderRotationInfoTable(info) {
  const tbody = document.querySelector("#rotationTable tbody");
  tbody.innerHTML = "";

  let total = 0;
  for (const row of info) { //TODO sort by best cost
    total += row.iterations;
    const tr = document.createElement("tr");
    const color = costToColor(row.cost, 80, -20); //TODO set this based on average costs?
    tr.innerHTML = `
      <td>${row.rotation.top} ${row.rotation.front}</td>
      <td style=${row.maxed ? `background:#ff0000` : ""}>${row.iterations}</td>
      <td style="background:${color};text-align:right">${row.cost}</td>
    `;
    tbody.appendChild(tr);
  }

  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `<td colspan="1"><b>Total Iterations</b></td><td><b>${total}</b></td>`;
  tbody.appendChild(totalRow);
}

setupCostForm(ScrambleOptimizer.defaultCostConfiguration, onSubmit);