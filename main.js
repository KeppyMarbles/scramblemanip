import { setupCostForm } from "./ui/form.js";
import { ScrambleOptimizer } from "./cube/scramble.js";

var optimizer;

async function onSubmit(newConfig) {
    
    //document.getElementById("breakdown").value = "";
    // TODO catch syntax errors
    const scramble = ScrambleOptimizer.getScramble(document.getElementById("scramble").value);


    const depth = parseFloat(document.getElementById("depth").value);
    const iterations = parseFloat(document.getElementById("iterations").value);
    const pruneRotations = document.getElementById("pruneRotations").checked;


    //Plotly.newPlot(document.getElementById("myChart"));
    await clearCharts();

    optimizer = new ScrambleOptimizer(newConfig, onRotationDone);

    console.time("optimizeTimer");
    //const result = optimizer.optimize(scramble, depth, 10000);
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

    const chartDiv = document.getElementById("myChart");
    let maxIndex = 0;
    for(let i = distribution.length-1; i >= 0; i--) {
      if(distribution[i] != 0) {
        maxIndex = i;
        break;
      }
    }
    const data = [{
        x: [...Array(maxIndex+10).keys()],
        y: distribution,
        type: 'bar'
    }];
    const layout = {
        xaxis: {
            title: "Scrambles Found",
        },
        yaxis: {
            title: "Scramble Cost"
        }
    };
    Plotly.newPlot(chartDiv, data, layout);
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
    const color = costToColor(row.cost, 50, -10);
    tr.innerHTML = `
      <td>${row.rotation.top} ${row.rotation.front}</td>
      <td>${row.iterations}</td>
      <td style="background:${color};text-align:right">${row.cost}</td>
    `;
    tbody.appendChild(tr);
  }

  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `<td colspan="1"><b>Total Iterations</b></td><td><b>${total}</b></td>`;
  tbody.appendChild(totalRow);
}

setupCostForm(ScrambleOptimizer.defaultCostConfiguration, onSubmit);