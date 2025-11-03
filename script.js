// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded - initializing app'); // Debug: Confirms load

  // ---- Motivational Thoughts ----
  const thoughts = [
    "You are not your thoughts. You are the awareness behind them.",
    "Taking a break doesn’t mean you’re weak — it means you care about your peace.",
    "Even on cloudy days, the sun still shines above.",
    "Progress, not perfection — that’s how healing happens.",
    "Your calm mind is the ultimate weapon against challenges."
  ];

  const newThoughtBtn = document.getElementById("newThoughtBtn");
  const thoughtElement = document.getElementById("thought");
  if (newThoughtBtn && thoughtElement) {
    newThoughtBtn.addEventListener("click", () => {
      const random = Math.floor(Math.random() * thoughts.length);
      thoughtElement.innerText = thoughts[random];
      console.log('New thought generated'); // Debug
    });
  } else {
    console.error('Motivational elements not found');
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
    console.log('Comparison chart created'); // Debug
  } else {
    console.error('Comparison chart element not found');
  }

  // ---- Live EMG Chart ----
  const emgChartElement = document.getElementById("emgChart");
  if (emgChartElement) {
    const ctxEmg = emgChartElement.getContext("2d");
    const emgData = { labels: [], data: [] };
    window.emgData = emgData; // Global for continuous access
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
        animation: { duration: 0 } // Faster updates for continuous feel
      }
    });
    console.log('EMG chart created'); // Debug
  } else {
    console.error('EMG chart element not found');
  }

  // DOM references - safe checks
  const statusText = document.getElementById('statusText');
  const connectBtn = document.getElementById('connectBtn');
  const suggestionText = document.getElementById('suggestionText');
  const testBtn = document.getElementById("testBtn");

  if (!statusText || !connectBtn || !suggestionText || !testBtn || !window.emgChart) {
    console.error('Required DOM elements or chart missing. Check your HTML.');
    return;
  }

  console.log('All elements found - setting up listeners'); // Debug

  // ---- Simulation / Hardware Connection ----
  let running = false;
  let time = 0;
  let currentPort = null;
  let hardwareStream = null; // Track hardware loop

  // Shared update function for both modes (continuous plotting)
  function updateChart(value) {
    console.log('Updating chart with value:', value); // Debug
    window.emgData.labels.push(time++);
    window.emgData.data.push(value);
    if (window.emgData.labels.length > 30) {
      window.emgData.labels.shift();
      window.emgData.data.shift();
    }
    window.emgChart.update('none'); // 'none' for instant continuous updates
  }

  function checkStress(value) {
    console.log('Checking stress for value:', value); // Debug
    if (value > 800) {
      suggestionText.innerText = "😣 High stress detected! Try deep breathing exercises.";
    } else if (value > 400) {
      suggestionText.innerText = "🙂 Moderate stress level. Consider taking a short break.";
    } else {
      suggestionText.innerText = "😌 You're in a calm state. Keep it up!";
    }
  }

  // Simulation mode - continuous loop
  function startSimulation() {
    console.log('Start simulation called'); // Debug
    if (running) {
      console.log('Simulation already running');
      return;
    }
    running = true;
    statusText.textContent = "🧪 Simulation running continuously... (Double-click to stop)";
    
    function simLoop() {
      if (!running) {
        console.log('Simulation loop stopped');
        return;
      }
      const newValue = Math.floor(Math.random() * 1000);
      updateChart(newValue);
      checkStress(newValue);
      setTimeout(simLoop, 1000); // Recursive for endless loop
    }
    simLoop();
  }

  testBtn.addEventListener("click", startSimulation);

  // Double-click to stop simulation
  testBtn.addEventListener("dblclick", () => {
    console.log('Double-click detected - stopping simulation'); // Debug
    if (running) {
      running = false;
      suggestionText.innerText = "🛑 Simulation stopped. Double-click Test to restart!";
      statusText.textContent = "Simulation paused.";
    }
  });

  // Hardware connection - continuous streaming
  connectBtn.addEventListener("click", async () => {
    console.log('Connect button clicked'); // Debug
    if (currentPort && !currentPort.closed) {
      // Disconnect
      try {
        await currentPort.close();
        currentPort = null;
        if (hardwareStream) {
          hardwareStream = null; // Stop loop
        }
        statusText.textContent = "🔌 Disconnected from Arduino.";
        suggestionText.innerText = "Ready to reconnect.";
        connectBtn.textContent = "🔌 Connect Arduino";
      } catch (err) {
        console.error('Disconnect error:', err);
      }
      return;
    }

    if (!("serial" in navigator)) {
      alert("❌ Web Serial API not supported. Use Chrome or Edge.");
      return;
    }

    try {
      currentPort = await navigator.serial.requestPort();
      await currentPort.open({ baudRate: 9600 });
      statusText.textContent = "✅ Connected to Arduino - Streaming...";
      connectBtn.textContent = "🔌 Disconnect";
      suggestionText.innerText = "Receiving live data...";

      const decoder = new TextDecoderStream();
      const inputDone = currentPort.readable.pipeTo(decoder.writable);
      const inputStream = decoder.readable;

      // Continuous background loop for hardware data
      hardwareStream = (async () => {
        try {
          for await (const chunk of inputStream) {
            if (currentPort.closed || !currentPort.readable) break;
            const lines = chunk.split('\n').filter(line => line.trim());
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
          statusText.textContent = `⚠️ Stream interrupted: ${err.message}`;
        } finally {
          inputDone.catch(() => {}); // Clean up
        }
      })();
      
      // Auto-disconnect on port close
      currentPort.addEventListener('close', () => {
        hardwareStream = null;
        statusText.textContent = "Port closed.";
      });

    } catch (err) {
      statusText.textContent = `⚠️ Connection failed: ${err.message}`;
      console.error(err);
      currentPort = null;
      connectBtn.textContent = "🔌 Connect Arduino";
    }
  });
});