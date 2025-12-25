# System Requirements Specification: Solar-Powered Remote Surf Camera
**Version:** 1.0  
**Date:** December 19, 2025

---

## 1. Project Overview
The objective of this project is to deploy a remote, solar-powered camera system capable of providing high-definition video streams on demand. The system operates autonomously in an off-grid environment, utilizing a Raspberry Pi Zero 2 W, a 40W solar array, and a lithium battery storage system.

---

## 2. System Architecture Requirements

### 2.1 Hardware Specification
| Component | Specification |
| :--- | :--- |
| **Compute** | Raspberry Pi Zero 2 W |
| **Imaging** | Raspberry Pi Camera Module (v2/v3) or HQ Camera |
| **Power Source** | 40W Monocrystalline Solar Panel |
| **Charge Management** | 12V Solar Charge Controller (PWM or MPPT) |
| **Energy Storage** | 12V 10Ah (min) LiFePO4 Battery |
| **Regulation** | 12V to 5V (3A) DC-DC Buck Converter (micro USB) |
| **Connectivity** | 4G/LTE High-speed Hotspot / Local WiFi |



### 2.2 Software Stack
* **OS:** Raspberry Pi OS Lite (64-bit, Debian Bookworm)
* **Language:** Python 3.11+
* **Web Framework:** Flask
* **Networking:** Tailscale (WireGuard-based mesh VPN)
* **Video Engine:** `libcamera` suite (Hardware-accelerated H.264)

---

## 3. Functional Requirements

### 3.1 On-Demand Streaming (Core Logic)
* **REQ 3.1.1:** The system shall remain in a low-power "Standby" state by default.
* **REQ 3.1.2:** Initialization of H.264 video stream shall only occur upon an authorized HTTP request via the Tailscale private IP.
* **REQ 3.1.3:** A **Watchdog Timer** shall terminate any active stream after 10 minutes to preserve battery.

### 3.2 Power & Battery Management
* **REQ 3.2.1:** Monitor battery voltage via an Analog-to-Digital Converter (ADC).
* **REQ 3.2.2:** Execute graceful shutdown (`sudo halt`) if battery voltage drops below **11.0V**.
* **REQ 3.2.3:** Automatically resume operations when solar power restores battery levels.
* **REQ 3.2.4:** Store and upload daily logs (charge state, errors, and shutdowns).

### 3.3 Remote Management
* **REQ 3.3.1:** SSH access enabled via Tailscale for debugging and updates.
* **REQ 3.3.2:** Utilize a `systemd` service for automatic application restarts on crash/reboot.

### 3.4 System Resilience & Error Handling
* **REQ 3.4.1:** **Network Recovery:** Attempt network restart after 15m of loss; full reboot after 30m.
* **REQ 3.4.2:** **Camera Reset:** Catch `libcamera` hangs, log error, and attempt hardware reset of the camera interface.
* **REQ 3.4.3:** **Storage Safety:** Implement `logrotate` (50MB cap) and 30-day auto-purge to prevent SD card saturation.
* **REQ 3.4.4:** **Hardware Watchdog:** Enable Pi Hardware Watchdog (`dtparam=watchdog=on`) for kernel panic recovery.

---

## 4. Non-Functional Requirements

### 4.1 Energy Efficiency
* **Target:** Idle power consumption < **0.8W**.
* **Optimization:** Disable HDMI, Bluetooth, and LEDs via `config.txt`.

### 4.2 Security
* **REQ 4.2.1:** No public internet exposure; control interface accessible exclusively via Tailscale.
* **REQ 4.2.2:** Token-based request authentication for stream triggers.

### 4.3 Reliability
* **REQ 4.3.1:** Automatic NAT traversal via Tailscale DERP or STUN/ICE.
* **REQ 4.3.2:** Use high-endurance SD cards or Read-Only filesystem mounts to prevent corruption.

---

## 5. Constraints and Assumptions
* **Environmental:** Must be housed in an **IP66-rated** weatherproof enclosure.
* **Temperature:** LiFePO4 battery must have low-temp disconnect or internal heater for freezing conditions.
* **Network:** Minimum **5 Mbps uplink** required for 720p/30fps streaming.
