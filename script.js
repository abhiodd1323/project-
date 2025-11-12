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
          data: [5,10,35],
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
          y: { title: { display: true, text: "Signal (mV)" }, min: 0, max: 60 }
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
  let currentPort = null; // Declare here to ensure scope
  let hardwareStream = null; // Track hardware loop
  let inputDone = null; // For pipe abort

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
    if (value > 35) {
      suggestionText.innerText = "😣 High stress detected! Try deep breathing exercises.";
    } else if (value > 10 && value < 35 ) {
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
      const newValue = Math.floor(Math.random() * 100);
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
    console.log('Connect/Disconnect button clicked'); // Debug
    if (currentPort && !currentPort.closed) {
      // Disconnect mode
      console.log('Attempting disconnect...'); // Debug
      try {
        // Abort the pipe to release stream lock
        if (inputDone && !inputDone.done) {
          await inputDone.cancel(); // Cancels pipeTo, unlocks streams
          console.log('Pipe aborted'); // Debug
        }

        // Release locks if active
        if (currentPort.readable.locked) {
          currentPort.readable.releaseLock();
        }
        if (currentPort.writable && currentPort.writable.locked) {
          currentPort.writable.releaseLock();
        }

        // Now safe to close
        await currentPort.close();
        currentPort = null;
        hardwareStream = null;
        inputDone = null; // Reset

        statusText.textContent = "🔌 Disconnected from Arduino.";
        suggestionText.innerText = "Ready to reconnect.";
        connectBtn.textContent = "🔌 Connect Arduino";
        console.log('Disconnect successful'); // Debug
      } catch (err) {
        console.error('Disconnect error:', err);
        // Force reset state even on error
        currentPort = null;
        hardwareStream = null;
        inputDone = null;
        statusText.textContent = "🔌 Force-disconnected (minor issue).";
        suggestionText.innerText = "Ready to reconnect.";
        connectBtn.textContent = "🔌 Connect Arduino";
      }
      return;
    }

    // Connect mode
    console.log('Attempting connect...'); // Debug
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
      console.log('Connect successful'); // Debug

      const decoder = new TextDecoderStream();
      inputDone = currentPort.readable.pipeTo(decoder.writable); // Store for abort
      const inputStream = decoder.readable;

      // Continuous background loop for hardware data
      hardwareStream = (async () => {
        try {
          for await (const chunk of inputStream) {
            if (currentPort.closed || !currentPort.readable || !hardwareStream) break; // Check stream active
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
          if (!currentPort.closed && hardwareStream) {
            statusText.textContent = `⚠️ Stream interrupted: ${err.message}`;
          }
        } finally {
          hardwareStream = null;
        }
      })();

      // Listen for port close (e.g., unplug)
      currentPort.addEventListener('close', () => {
        console.log('Port closed by system'); // Debug
        hardwareStream = null;
        inputDone = null;
        statusText.textContent = "Port closed (unplugged?).";
        connectBtn.textContent = "🔌 Connect Arduino";
      });

    } catch (err) {
      console.error('Connect error:', err);
      statusText.textContent = `⚠️ Connection failed: ${err.message}`;
      currentPort = null;
      connectBtn.textContent = "🔌 Connect Arduino";
    }
  });

  // Breathing Exercise
  const breathingCircle = document.getElementById('breathingCircle');
  const breathingText = document.getElementById('breathingText');
  const startBreathing = document.getElementById('startBreathing');
  let isBreathing = false;

  function startBreathingExercise() {
    if (isBreathing) return;
    isBreathing = true;
    breathingCircle.classList.add('breathing');
    startBreathing.textContent = 'Stop Exercise';

    function updateBreathingText() {
      const time = Date.now() % 8000; // 8-second cycle
      if (time < 4000) {
        breathingText.textContent = 'Inhale...';
      } else {
        breathingText.textContent = 'Exhale...';
      }
    }

    const textInterval = setInterval(updateBreathingText, 100);
    startBreathing.onclick = () => {
      isBreathing = false;
      breathingCircle.classList.remove('breathing');
      breathingText.textContent = 'Click to start breathing exercise';
      startBreathing.textContent = 'Start Exercise';
      clearInterval(textInterval);
      startBreathing.onclick = startBreathingExercise;
    };
  }

  startBreathing.addEventListener('click', startBreathingExercise);
});
