# KTool - Mechanical Keyboard Manager

A modern web-based tool for managing mechanical keyboards using WebHID API. Similar to VIA, but with enhanced features and a clean, responsive interface.

## Features

- 🔌 **WebHID Connection**: Direct connection to compatible QMK keyboards via WebHID
- ⌨️ **Keymap Management**: Load, edit, and apply keymaps to your keyboard
- 🎨 **Visual Editor**: Interactive keymap editor with grid-based interface
- 📁 **VIA Compatibility**: Import and export VIA layout files
- 💾 **EEPROM Access**: Read and write EEPROM data
- 🎯 **QMK Integration**: Full QMK command support (ping, version, bootloader reset)
- 🎨 **Layout Visualization**: Visual keyboard layout rendering with key positions
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Supported Browsers

- Google Chrome (recommended)
- Microsoft Edge
- Other Chromium-based browsers with WebHID support

## Getting Started

### Prerequisites

- Node.js 18+
- A compatible QMK keyboard with WebHID firmware

### Installation

1. Clone the repository:
```bash
git clone https://github.com/daids/ktool.git
cd ktool
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. **Connect Keyboard**: Click "Connect Keyboard" and select your device
2. **Load Keymap**: Load existing keymap from your keyboard or import a VIA layout
3. **Edit Keymap**: Use the visual editor to modify key assignments
4. **Apply Changes**: Send the updated keymap to your keyboard

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── KeymapEditor.tsx  # Keymap grid editor
│   └── KeyboardLayout.tsx # Keyboard layout visualizer
├── lib/                   # Core libraries
│   ├── webhid.ts         # WebHID communication
│   ├── qmk.ts            # QMK command interface
│   └── via.ts            # VIA layout handling
└── keychron_v5.json       # Example keyboard layout
```

## Keyboard Compatibility

This tool works with QMK keyboards that implement the required HID commands. The firmware must support:

- WebHID interface
- Custom QMK commands (ping, keymap get/set, EEPROM access)
- Compatible matrix layout

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [QMK Firmware](https://qmk.fm/) - Quantum Mechanical Keyboard Firmware
- [VIA](https://caniusevia.com/) - Keyboard configuration software
- [WebHID API](https://web.dev/hid/) - Web HID API specification
