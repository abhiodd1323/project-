// ---- Motivational Thoughts ----
const thoughts = [
  "You are not your thoughts. You are the awareness behind them.",
  "Taking a break doesn’t mean you’re weak — it means you care about your peace.",
  "Even on cloudy days, the sun still shines above.",
  "Progress, not perfection — that’s how healing happens.",
  "Your calm mind is the ultimate weapon against challenges."
];

document.getElementById("newThoughtBtn").addEventListener("click", () => {
  const random = Math.floor(Math.random() * thoughts.length);
  document.getElementById("thought").innerText = thoughts[random];
});

// ---- Comparison Chart ----
const ctxComp = document.getElementById("comparisonChart").getContext("2d");
new Chart(ctxComp, {
  type: "bar",
  data: {
    labels: ["Normal", "Medium Stress", "High Stress"],
    datasets: [{
      label: "EMG Signal Strength (mV)",
      data: [10, 35, 70],
      backgroundColor: ["#bde0fe", "#ffafcc", "#ff595e"]
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Signal (mV)" } },
      x: { title: { display: true, text: "Stress Levels" } }
    }
  }
});

// ---- Live EMG Chart ----
const ctxEmg = document.getElementById("emgChart").getContext("2d");
const emgData = { labels: [], data: [] };
const emgChart = new Chart(ctxEmg, {
  type: "line",
  data: {
    labels: emgData.labels,
    datasets: [{
      label: "EMG Value",
      data: emgData.data,
      borderColor: "#ff595e",
      fill: false,
      tension: 0.3
    }]
  },
  options: {
    scales: {
      x: { title: { display: true, text: "Time (s)" } },
      y: { title: { display: true, text: "Signal (mV)" }, min: 0, max: 1000 }
    }
  }
});

// ---- Simulation / Hardware Connection ----
let running = false;
let time = 0;

function updateGraph() {
  if (!running) return;
  const newValue = Math.floor(Math.random() * 1000);
 
  emgData.labels.push(time++);
  emgData.data.push(newValue);
  if (emgData.labels.length > 30) {
    emgData.labels.shift();
    emgData.data.shift();
  }
  emgChart.update();

  const suggestionText = document.getElementById("suggestionText");
  if (newValue > 65) suggestionText.innerText = "😣 High stress! Try deep breathing.";
  else if (newValue > 30) suggestionText.innerText = "🙂 Moderate stress. Take a short break.";
  else suggestionText.innerText = "😌 You seem calm and relaxed.";
  
  setTimeout(updateGraph, 1000);
}

document.getElementById("testBtn").addEventListener("click", () => {
  running = true;
  updateGraph();
});

// Double-click on testBtn to stop simulation
document.getElementById("testBtn").addEventListener("dblclick", () => {
  if (running) {
    running = false;
    const suggestionText = document.getElementById("suggestionText");
    suggestionText.innerText = "🛑 Simulation stopped. Ready to restart!";
  }
});

// Placeholder for real hardware (later use Serial/WebSerial)
// --- Arduino connection ---
let currentPort = null;

connectBtn.addEventListener("click", async () => {
    if (currentPort) {
        await currentPort.close();
        currentPort = null;
    }

    try {
        currentPort = await navigator.serial.requestPort();
        await currentPort.open({ baudRate: 9600 });
        statusText.textContent = "✅ Connected to Arduino UNO";
        
        const decoder = new TextDecoderStream();
        const inputDone = currentPort.readable.pipeTo(decoder.writable);
        const inputStream = decoder.readable;

        for await (const chunk of inputStream) {
          const lines = chunk.split('\n');
          for (let line of lines) {
            const value = parseInt(line.trim());
            if (!isNaN(value)) {
              updateChart(value);
              checkStress(value);
            }
          }
        }
    } catch (err) {
        statusText.textContent = `⚠️ Connection failed: ${err.message}`;
        console.error(err);
        currentPort = null;
    }
});

function updateChart(value) {
    emgData.labels.push(time++);
    emgData.data.push(value);
    if (emgData.labels.length > 30) {
        emgData.labels.shift();
        emgData.data.shift();
    }
    emgChart.update();
}

function checkStress(value) {
    const suggestionText = document.getElementById("suggestionText");
    if (value > 800) {
        suggestionText.innerText = "😣 High stress detected! Try deep breathing exercises.";
    } else if (value > 400) {
        suggestionText.innerText = "🙂 Moderate stress level. Consider taking a short break.";
    } else {
        suggestionText.innerText = "😌 You're in a calm state. Keep it up!";
    }
}

// Add this near the top of your file, with other DOM references
const statusText = document.getElementById('statusText');