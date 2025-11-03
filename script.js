// Wait for DOM to load before running any code
document.addEventListener('DOMContentLoaded', () => {
  // ---- Motivational Thoughts ----
  const thoughts = [
    "You are not your thoughts. You are the awareness behind them.",
    "Taking a break doesn’t mean you’re weak — it means you care about your peace.",
    "Even on cloudy days, the sun still shines above.",
    "Progress, not perfection — that’s how healing happens.",
    "Your calm mind is the ultimate weapon against challenges."
  ];

  // Check if elements exist before adding listeners
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
    window.emgData = emgData; // Make global for access in other functions
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
        scales: {
          x: { title: { display: true, text: "Time (s)" } },
          y: { title: { display: true, text: "Signal (mV)" }, min: 0, max: 1000 }
        }
      }
    });
  }

  // DOM references - safe checks
  const statusText = document.getElementById('statusText');
  const connectBtn = document.getElementById('connectBtn');
  const suggestionText = document.getElementById('suggestionText');
  const testBtn = document.getElementById("testBtn");

  if (!statusText || !connectBtn || !suggestionText || !testBtn) {
    console.error('Required DOM elements missing. Check your HTML IDs.');
    return;
  }

  // ---- Simulation / Hardware Connection ----
  let running = false;
  let time = 0;
  let currentPort = null;

  function updateGraph() {
    if (!running) return;
    const newValue = Math.floor(Math.random() * 1000);
   
    window.emgData.labels.push(time++);
    window.emgData.data.push(newValue);
    if (window.emgData.labels.length > 30) {
      window.emgData.labels.shift();
      window.emgData.data.shift();
    }
    window.emgChart.update();

    if (newValue > 65) suggestionText.innerText = "😣 High stress! Try deep breathing.";
    else if (newValue > 30) suggestionText.innerText = "🙂 Moderate stress. Take a short break.";
    else suggestionText.innerText = "😌 You seem calm and relaxed.";
    
    setTimeout(updateGraph, 1000);
  }

  testBtn.addEventListener("click", () => {
    running = true;
    updateGraph();
  });

  // Double-click on testBtn to stop simulation
  testBtn.addEventListener("dblclick", () => {
    if (running) {
      running = false;
      suggestionText.innerText = "🛑 Simulation stopped. Ready to restart!";
    }
  });

  // --- Arduino connection ---
  connectBtn.addEventListener("click", async () => {
    if (currentPort) {
      await currentPort.close();
      currentPort = null;
      statusText.textContent = "Disconnected from Arduino.";
      return;
    }

    if (!("serial" in navigator)) {
      alert("❌ Web Serial API not supported. Use Chrome or Edge browser.");
      return;
    }

    try {
      currentPort = await navigator.serial.requestPort();
      await currentPort.open({ baudRate: 9600 });
      statusText.textContent = "✅ Connected to Arduino UNO";
      
      const decoder = new TextDecoderStream();
      currentPort.readable.pipeTo(decoder.writable).catch(err => console.error('PipeTo error:', err));
      const inputStream = decoder.readable;

      // Run in background to avoid blocking
      (async () => {
        try {
          for await (const chunk of inputStream) {
            if (!currentPort || currentPort.closed) break;
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
          console.error('Stream error:', err);
        }
      })();

    } catch (err) {
      statusText.textContent = `⚠️ Connection failed: ${err.message}`;
      console.error(err);
      currentPort = null;
    }
  });

  function updateChart(value) {
    window.emgData.labels.push(time++);
    window.emgData.data.push(value);
    if (window.emgData.labels.length > 30) {
      window.emgData.labels.shift();
      window.emgData.data.shift();
    }
    window.emgChart.update();
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
});