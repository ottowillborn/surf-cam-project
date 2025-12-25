**Project Overview**
- **Name:** Surf Cam Project
- **Description:** Mobile app + Raspberry Pi controller for capturing and serving surf camera streams. The repository contains a React Native mobile app (`mobile-app`) and a Python-based Pi controller (`pi-controller`).

**Repository Layout**
- **mobile-app:** React Native / Expo app for iOS and Android (contains `ios/`, `android/`, and app source).
- **pi-controller:** Python scripts that run on a Raspberry Pi for camera capture and control (`camera_server.py`, `controller.py`).

**Prerequisites (macOS)**
- **Homebrew:** Optional but recommended for installing tools.
- **Node.js:** v16+ (LTS) or v18+. Install via Homebrew or nvm.
- **Yarn** or **npm**: preference optional. Use `npm` if you don't use Yarn.
- **Expo CLI:** `npm install -g expo-cli` (for classic Expo projects) or use `npx` commands.
- **EAS CLI:** `npm install -g eas-cli` (for builds/releases using EAS)
- **Xcode:** Required for iOS simulator and builds; install from App Store.
- **CocoaPods:** `sudo gem install cocoapods` (or `brew install cocoapods`) — used in `mobile-app/ios`.
- **Python 3.8+:** For the `pi-controller` code running on Raspberry Pi or local tests.

