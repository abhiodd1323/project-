# MindWave — EMG Stress Detection & Relaxation

A lightweight web app that visualizes live EMG data (from an Arduino + EMG sensor) to detect stress, provide real‑time feedback, and offer quick relaxation aids and motivational prompts.

## Features

- Live EMG chart and stress-level comparison
- Test mode to simulate EMG data (no hardware required)
- Connect to Arduino via Web Serial for real sensor streaming
- Simple mini relaxation game (breathing-paced interaction)
- Suggestions and motivational thoughts based on detected levels

## Hardware

- Arduino UNO (or compatible)
- EMG sensor module (e.g., MyoWare)
- Connecting wires and electrodes

## Software / Browser

- Modern Chromium-based browser with Web Serial support (Chrome, Edge)
- No backend required; client-side web app
- Uses Chart.js for graphs

## Installation (local)

1. Clone the repo:
   - git clone https://github.com/abhiodd1323/project-.git
2. Open the project folder:
   - cd project-
3. Open index.html in a browser (or use a simple local server):
   - PowerShell: python -m http.server 8000
   - Then visit http://localhost:8000

## Usage

- Test Mode: Click "Test Without Hardware" to simulate EMG data.
- Hardware: Click "Connect to Hardware", select your serial port, grant permission, and live EMG values will stream to the charts.
- Interpret values: (example) 0–400 calm, 400–800 mild stress, 800–1023 high stress — tune thresholds in script.js.

## File structure

- index.html — main UI and documentation content
- style.css — styles
- script.js — simulation, Web Serial connection, charts, thresholds
- README.md — this file

## Development / Contributing

- Make changes on a feature branch, open a PR with description and testing steps.
- Keep commits focused and include meaningful messages.

## References

- Ahmed M., et al. “A Comprehensive Analysis of Trapezius Muscle EMG Activity in Relation to Stress and Meditation.” BioMedInformatics. 2024.
- Rissén D., et al. “Surface EMG and psychophysiological stress reactions in a real‑life study.” (2000)
- Luijcks R., et al. “Experimentally Induced Stress Validated by EMG Activity.” (2014)

## Author

Abhishek R

## License

Specify a license (e.g., MIT) or add one before publishing.
