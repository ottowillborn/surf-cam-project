# Architecture Document - Surf Camera

This document details the Architectural Decision Records (ADRs) for the Surf Camera project, focusing on power efficiency, remote connectivity, and hardware integration.

---

## ADR 001: Choice of Python for Application Logic
**Status:** Decided | **Group:** Presentation and Logic

* **Issue:** The project requires a way to manage hardware, handle networking, and implement power-saving logic. We need a language that balances development speed with Pi-specific hardware library support.
* **Decision:** Use **Python 3** as the primary programming language.
* **Assumptions:** Running Raspberry Pi OS; development time is a constraint.
* **Constraints:** Higher CPU overhead than C++, but the Zero 2 W’s quad-core is sufficient.
* **Argument:** Allows rapid prototyping. Using `subprocess` allows Python to hand off heavy video encoding to the hardware H.264 encoder, nullifying the performance gap.
* **Implications:** Requires a virtual environment (venv) to manage dependencies.

---

## ADR 002: Choice of Tailscale for Remote Connectivity
**Status:** Decided | **Group:** Integration and Security

* **Issue:** Remote sites using cellular hotspots use **CGNAT**, making traditional port forwarding impossible. We need secure, reliable remote access.
* **Decision:** Implement **Tailscale** for networking.
* **Positions:**
    * *Port Forwarding:* Not viable due to CGNAT.
    * *Cloudflare Tunnels:* Strong but more complex for P2P video.
    * *Tailscale:* Zero-config, WireGuard-based mesh VPN.
* **Argument:** Tailscale provides a static private IP, ensuring the "Start Stream" request always reaches the device regardless of the local network environment.
* **Implications:** Every viewing device must be logged into the same "Tailnet."



---

## ADR 003: Choice of Flask for Request Handling
**Status:** Decided | **Group:** Presentation / Logic

* **Issue:** Requires a lightweight listener for "Start/Stop" commands with minimal idle resource usage.
* **Decision:** Use **Flask** (WSGI-based) as the web micro-framework.
* **Positions:**
    * *FastAPI:* High efficiency but adds unnecessary async overhead for this use case.
    * *Flask:* Extremely lightweight (~15MB RAM footprint) and simple to implement.
* **Argument:** Matches the Pi Zero 2 W's limited 512MB RAM perfectly.
* **Implications:** Application listens on a specific port accessible only via Tailnet.

---

## ADR 004: Choice of libcamera (rpicam-apps) for Imaging
**Status:** Decided | **Group:** Data / Hardware Integration

* **Issue:** Legacy camera stacks (`raspivid`) are deprecated. We need a modern way to stream H.264 video from newer sensors.
* **Decision:** Standardize on **libcamera** (`libcamera-vid`).
* **Constraints:** Shifts some processing to the ARM CPU, increasing load compared to the legacy stack.
* **Argument:** Official standard for 2025; offers better image tuning and precise bitrate control for limited cellular bandwidth.
* **Implications:** Must use `--nopreview` to save CPU cycles.

---

## ADR 005: Choice of Raspberry Pi OS Lite (64-bit)
**Status:** Decided | **Group:** Operating System

* **Issue:** Solar-powered devices must strip non-essential processes to lower idle power consumption.
* **Decision:** Use **Raspberry Pi OS Lite (64-bit)**.
* **Constraints:** No Graphical User Interface (GUI); CLI/SSH only.
* **Argument:** Reduces idle RAM usage to <140MB and allows disabling HDMI/LEDs to save ~25mA of current.
* **Implications:** Requires comfort with Linux terminal for maintenance.
