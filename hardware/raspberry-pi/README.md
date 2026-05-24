# Capapply Raspberry Pi hardware

Runs on the Pi next to the speaker and motor.

## Setup

```bash
sudo apt install ffmpeg alsa-utils python3-pip
pip install -r requirements.txt
```

## Run

```bash
export CAPAPPLY_MOTOR_GPIO_PIN=17
export CAPAPPLY_SPEAKER_DEVICE=default
python3 server.py
```

On the Capapply server, set:

```env
HARDWARE_MODE=raspberry
RASPBERRY_PI_URL=http://<pi-ip>:8765
MOTOR_MOVE_MS=2000
```

## Endpoints

- `GET /health` — liveness check
- `POST /play` — multipart field `audio` (generated song/vocal file)
- `POST /motor/move` — JSON `{ "durationMs": 2000 }`

Playback runs first; the orchestrator calls motor move after playback finishes.
