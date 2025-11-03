// Hardware connection - continuous streaming with robust disconnect
let inputDone = null; // Store pipe promise for abort

connectBtn.addEventListener("click", async () => {
  console.log('Connect/Disconnect button clicked'); // Debug (remove later)

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

    // Continuous background loop
    hardwareStream = (async () => {
      try {
        for await (const chunk of inputStream) {
          if (currentPort.closed || !currentPort.readable || !hardwareStream) break;
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