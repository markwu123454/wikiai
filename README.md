# Custom AI Overview Tab

This Chrome extension replaces the Google Search AI Overview tab with a custom, empty tab. The functionality can be toggled via a simple popup UI in the Chrome toolbar.

## Features:
- Replaces the AI Overview tab in Google Search results with a custom tab.
- Toggle the feature on or off through a checkbox in the extension popup.

## Installation:
1. Clone or download the repository.
2. Go to `chrome://extensions/` in your Chrome browser.
3. Enable "Developer mode" at the top right.
4. Click "Load unpacked" and select the folder containing the extension files.
5. The extension icon will appear in your browser toolbar. Click it to toggle the feature.

## How it works:
- The extension listens for the toggle action from the popup.
- When enabled, the AI Overview tab is replaced with a custom empty tab.
- When disabled, the page reloads to restore the original AI Overview tab.

## License:
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
