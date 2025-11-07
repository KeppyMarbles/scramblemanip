import { setupCostForm } from "./ui/form.js";
import { defaultCostConfiguration } from "./cube/costConfig.js";
import { getScramble, optimizeScramble, analyzeScramble, distribution } from "./cube/scramble.js";
import { Move } from "./cube/move.js";

function onSubmit(newConfig) {
    
    //document.getElementById("breakdown").value = "";
    const scramble = getScramble(document.getElementById("scramble").value);
    const depth = parseFloat(document.getElementById("depth").value);
    console.time("optimizeTimer");
    const result = optimizeScramble(scramble, newConfig, depth);
    console.timeEnd("optimizeTimer");
    console.log(result);
    const { totalCost, breakdown } = analyzeScramble(result.bestScramble);

    renderCostTable(breakdown)

    if(result.bestRotation.top)
        result.bestScramble.unshift(Move.fromString(result.bestRotation.top));
    if(result.bestRotation.front)
        result.bestScramble.unshift(Move.fromString(result.bestRotation.front));

    document.getElementById("output").value = result.bestScramble.map(m => m.toString()).join(" ");
    
    updateChart(distribution);

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

setupCostForm(defaultCostConfiguration, onSubmit);