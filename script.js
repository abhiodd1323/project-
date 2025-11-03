// Wait for DOM to load (prevents ReferenceErrors)
document.addEventListener('DOMContentLoaded', () => {
  // ---- Motivational Thoughts ----
  const thoughts = [
    "You are not your thoughts. You are the awareness behind them.",
    "Taking a break doesn't mean you're weak — it means you care about your peace.",
    "Even on cloudy days, the sun still shines above.",
    "Progress, not perfection — that's how healing happens.",
    "Your calm mind is the ultimate weapon against challenges."
  ];

  const newThoughtBtn = document.getElementById("newThoughtBtn");
  const thoughtElement = document.getElementById("thought");
  if (newThoughtBtn && thoughtElement) {
    newThoughtBtn.addEventListener("click", () => {
      const random = Math.floor(Math.random() * thoughts.length);
      thoughtElement.innerText = thoughts[random];
    });
  }

  // ---- Comparison Chart ----
  const comparisonChartElement = document.getElementById("comparisonChart");
  if (comparisonChartElement) {
    const ctxComp = comparisonChartElement.getContext("2d");
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
  }

  // ---- Live EMG Chart ----
  const emgChartElement = document.getElementById("emgChart");
  if (emgChartElement) {
    const ctxEmg = emgChartElement.getContext("2d");
    const emgData = { labels: [], data: [] };
    window.emgData = emgData; // Global for easy access
    window.emgChart = new Chart(ctxEmg, {
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
        responsive: true,
        scales: {
          x: { title: { display: true, text: "Time (s)" } },
          y: { title: { display: true, text: "Signal (mV)" }, min: 0, max: 1000 }
        },
        animation: { duration: 0 } // No animation for continuous feel
      }
    });
  }

  // DOM references (safe checks)
  const statusText = document.getElementById('statusText');
  const connectBtn = document.getElementById('connectBtn');
  const suggestionText = document.getElementById('suggestionText');
  const testBtn = document.getElementById("testBtn");

  if (!statusText || !connectBtn || !suggestionText || !testBtn || !window.emgChart) {
    console.error('Missing elements or chart. Check HTML IDs.');
    return;
  }

  // Get DOM elements
  const valueDisplay = document.getElementById('currentValue');
  const emgChartElement = document.getElementById('emgChart');
  const statusText = document.getElementById('statusText');
  const suggestionText = document.getElementById('suggestionText');

  if (!valueDisplay || !emgChartElement || !statusText || !suggestionText) {
      console.error('Required elements not found');
      return;
  }

  // Initialize value display
  valueDisplay.innerHTML = 'Current EMG Value: <span>0</span> mV';

  // Core update function (used by both modes)
  function updateChart(value) {
    try {
      // Update chart data
      window.emgData.labels.push(time++);
      window.emgData.data.push(value);
      if (window.emgData.labels.length > 30) {
        window.emgData.labels.shift();
        window.emgData.data.shift();
      }
      window.emgChart.update('none');

      // Update value display with color coding
      valueDisplay.innerHTML = `Current EMG Value: <span style="color: ${
        value > 800 ? '#ff595e' : 
        value > 400 ? '#ffafcc' : 
        '#bde0fe'
      }">${value}</span> mV`;

      // Update stress level message
      checkStress(value);
      
    } catch (err) {
      console.error('Update error:', err);
      statusText.textContent = `Error updating display: ${err.message}`;
    }
  }

  function checkStress(value) {
    if (value > 800) {
      suggestionText.innerText = "😣 High stress detected! Try deep breathing exercises.";
    } else if (value > 400) {
      suggestionText.innerText = "🙂 Moderate stress level. Consider taking a short break.";
    } else {
      suggestionText.innerText = "😌 You're in a calm state. Keep it up!";
    }
  }

  // Simulation: Continuous recursive loop
  function startSimulation() {
    if (running) return;
    running = true;
    statusText.textContent = "🧪 Simulation running... (Double-click Test to stop)";
    
    function simLoop() {
      if (!running) {
        running = false;
        return;
      }
      const newValue = Math.floor(Math.random() * 1000);
      updateChart(newValue);
      checkStress(newValue);
      setTimeout(simLoop, 1000); // Calls itself every 1s – endless until stopped
    }
    simLoop();
  }

  testBtn.addEventListener("click", startSimulation);

  // Double-click to stop simulation
  testBtn.addEventListener("dblclick", () => {
    if (running) {
      running = false;
      suggestionText.innerText = "🛑 Simulation stopped. Click Test to restart!";
      statusText.textContent = "Simulation paused.";
    }
  });

  // Hardware: Continuous stream with error recovery
  connectBtn.addEventListener("click", async () => {
    if (currentPort && !currentPort.closed) {
      // Disconnect
      try {
        await currentPort.close();
      } catch (err) {
        console.error('Disconnect error:', err);
      }
      currentPort = null;
      statusText.textContent = "🔌 Disconnected.";
      suggestionText.innerText = "Ready to reconnect.";
      connectBtn.textContent = "🔌 Connect Arduino";
      return;
    }

    // Connect
    if (!("serial" in navigator)) {
      alert("❌ Web Serial API not supported. Use Chrome or Edge.");
      return;
    }

    try {
      currentPort = await navigator.serial.requestPort();
      await currentPort.open({ baudRate: 9600 });
      statusText.textContent = "✅ Connected – Streaming continuously...";
      connectBtn.textContent = "🔌 Disconnect";
      suggestionText.innerText = "Live data incoming...";

      const decoder = new TextDecoderStream();
      currentPort.readable.pipeTo(decoder.writable);
      const inputStream = decoder.readable;

      // Continuous async loop (non-blocking)
      (async () => {
        try {
          for await (const chunk of inputStream) {
            if (currentPort.closed) break;
            const lines = chunk.split('\n').filter(l => l.trim());
            for (let line of lines) {
              const value = parseInt(line.trim());
              if (!isNaN(value)) {
                updateChart(value);
                checkStress(value);
              }
            }
          }
        } catch (err) {
          console.error('Stream error:', err);
          if (!currentPort.closed) {
            statusText.textContent = `⚠️ Stream paused: ${err.message}. Reconnecting in 5s...`;
            setTimeout(() => connectBtn.click(), 5000); // Auto-retry
          }
        }
      })();

    } catch (err) {
      statusText.textContent = `⚠️ Connection failed: ${err.message}`;
      console.error(err);
      currentPort = null;
    }
  });
});