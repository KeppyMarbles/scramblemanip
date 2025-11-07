import { setupCostForm } from "./ui/form.js";
import { ScrambleOptimizer } from "./cube/scramble.js";

var optimizer;

function onSubmit(newConfig) {
    
    //document.getElementById("breakdown").value = "";
    const scramble = ScrambleOptimizer.getScramble(document.getElementById("scramble").value);
    const depth = parseFloat(document.getElementById("depth").value);

    optimizer = new ScrambleOptimizer(newConfig);

    console.time("optimizeTimer");
    //const result = optimizer.optimize(scramble, depth, 10000);
    optimizer.optimize(scramble, depth, 100000);
    console.timeEnd("optimizeTimer");

    //console.log(result);
    const breakdown = optimizer.analyzeBest();

    renderCostTable(breakdown)
    
    document.getElementById("output").value = optimizer.getBestAsString();
    
    updateChart(optimizer.distribution);

}

function updateChart(distribution) {
    const chartDiv = document.getElementById("myChart");
    const data = [{
        x: [...Array(300).keys()],
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

function costToColor(cost, maxAbsCost = 5) {
  cost -= 2;
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
    const color = costToColor(row.addedCost);
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

setupCostForm(ScrambleOptimizer.defaultCostConfiguration, onSubmit);