// Hardware connection - continuous streaming with robust disconnect
connectBtn.addEventListener("click", async () => {
  console.log('Connect/Disconnect button clicked'); // Debug
  if (currentPort && !currentPort.closed) {
    // Disconnect mode
    console.log('Attempting disconnect...'); // Debug
    try {
      // Stop any ongoing stream
      if (hardwareStream) {
        hardwareStream = null; // Break the loop
      }
      await currentPort.close();
      currentPort = null;
      statusText.textContent = "🔌 Disconnected from Arduino.";
      suggestionText.innerText = "Ready to reconnect.";
      connectBtn.textContent = "🔌 Connect Arduino";
      console.log('Disconnect successful'); // Debug
    } catch (err) {
      console.error('Disconnect error:', err); // Log the issue
      // Force cleanup even on error
      currentPort = null;
      hardwareStream = null;
      statusText.textContent = "🔌 Force-disconnected.";
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
    currentPort.readable.pipeTo(decoder.writable).catch(err => console.error('PipeTo error:', err));
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
        hardwareStream = null; // Clean up
      }
    })();

    // Listen for port close (e.g., unplug)
    currentPort.addEventListener('close', () => {
      console.log('Port closed by system'); // Debug
      hardwareStream = null;
      statusText.textContent = "Port closed (unplugged?).";
      connectBtn.textContent = "🔌 Connect Arduino";
    });

  } catch (err) {
    console.error('Connect error:', err); // Log
    statusText.textContent = `⚠️ Connection failed: ${err.message}`;
    currentPort = null;
    connectBtn.textContent = "🔌 Connect Arduino";
  }
});