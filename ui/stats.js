export async function drawOptimizerStats(optimizer) {
    if(optimizer) {
        drawDistributionChart(optimizer.distribution);
        drawRotationInfoTable(optimizer.rotationInfo);
        document.getElementById("output").textContent = optimizer.getBestAsString();
        drawCostTable(optimizer.analyzeBest());
    }
    else {
        drawDistributionChart([]);
        drawRotationInfoTable([]);
        drawCostTable([]);
        document.getElementById("output").textContent = "";
    }
    await new Promise(requestAnimationFrame);
}

function drawDistributionChart(distribution) {
    const costs = Array.from(distribution.keys()).sort((a, b) => a - b);
    const counts = costs.map(c => distribution.get(c));
    const data = [{
        x: costs,
        y: counts,
        type: 'bar',
    }];
    const layout = {
        margin: {
          l: 50,
          r: 50,
          b: 50,
          t: 10,
          pad: 4
        },
        xaxis: {
            title: "Scramble Cost",
        },
        yaxis: {
            title: "Scrambles Found"
        },
        paper_bgcolor: document.body.style.backgroundColor,
        plot_bgcolor: document.body.style.backgroundColor
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

export function costToColor(cost, maxAbsCost, shift) {
  cost += shift;
  const ratio = Math.max(-1, Math.min(1, cost / maxAbsCost));
  const hue = 60 - ratio * 60;
  return `hsl(${hue}, 100%, 65%)`;
}

function drawCostTable(breakdowns) {
  
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

function drawRotationInfoTable(info) {
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