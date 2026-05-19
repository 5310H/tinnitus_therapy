# Bill of Materials (BOM) - Finger Pacer Hardware

This document lists the components required to build the professional-grade Finger Pacer for bimodal tinnitus therapy. This device supports **Dual-Connectivity**: Bluetooth Low Energy (BLE) for wireless convenience and USB-C for maximum reliability on desktops or Android phones.

## 1. Core Components

| Item | Part Number | Quantity | Est. Cost (USD) | Source |
| :--- | :--- | :---: | :---: | :--- |
| **Rakklor Headphones** | BT 5.4 (20Hr) | 1 | ~$25.00 | [Amazon](https://www.amazon.com/) |
| **M5Stack Atom Lite** | C008 | 1 | $7.50 | [M5Stack Store](https://shop.m5stack.com/products/atom-lite-esp32-development-kit) |
| **Haptic Motor Unit** | U083 | 1 | $4.95 | [M5Stack Store](https://shop.m5stack.com/products/haptic-motor-unit) |
| **Grove Cable (20cm)** | Included with Unit | 1 | $0.00 | Included with Haptic Unit |

## 2. Power Options (Choose One)

| Item | Description | Est. Cost (USD) | Source |
| :--- | :--- | :---: | :--- |
| **USB-C OTG Cable** | Required for **Wired Phone Mode** (Android) or charging | $5.00 | Common |
| **Atom TailBat** | Clip-on 190mAh battery for **Wireless Mode** (BLE) | $4.50 | [M5Stack Store](https://shop.m5stack.com/products/atom-tailbat) |

## 3. Ergonomics & Enclosure

| Item | Description | Source |
| :--- | :--- | :--- |
| **10mm Velcro Strap** | Adjustable strap to hold the pacer to your finger | [Amazon/Hardware Store](https://www.amazon.com/dp/B001E1Y5O6) |
| **3D Printed Saddle** | Ergonomic Bone-Conduction Mount (v3) | Use `saddle.scad`. See `hardware.html` for printing specs. |

## 4. Software Requirements

- **ESPHome:** Used to flash the firmware provided in `finger_pacer.yaml`.
- **Web Browser:** Google Chrome, Microsoft Edge, or Opera (required for Web Bluetooth support).

## Total Estimated Build Cost: ~$15.00 - $25.00 USD

---

### Assembly Instructions
1. Connect the **Haptic Motor Unit** to the **Atom Lite** using the Grove cable.
2. Secure the Haptic Unit to the 3D-printed mount (or directly to your finger using the Velcro strap).
3. Flash the **Atom Lite** with the `finger_pacer.yaml` configuration via ESPHome.
4. Open the **Dual-Stimulus** module in the suite and click **"Connect Wireless"**.