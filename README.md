# AFK Hobbit for Alt1

An Alt1 app based on RuneApps AFK Warden.

AFK Hobbit keeps the AFK Warden alerts and presets, uses the current external
Alt1 chatbox reader, lets you select which detected chat window supplies chat
alerts, and adds a Mining Stamina alert.

See [README-COMPARISON.md](README-COMPARISON.md) for the differences from
RuneApps AFK Warden.

## Requirements

- [Alt1 Toolkit](https://runeapps.org/alt1)
- Alt1's **Screen pixels**, **Game state**, and **Overlay** permissions
- RuneScape interface scaling set to 100% for Mining Stamina detection

## Install

Open this appconfig URL in Alt1:

`alt1://addapp/https://hobbitcraft.github.io/afk-hobbit-alt1/appconfig.json`

## Chat Alerts

Open Settings and choose the chat index used by chat alerts. AFK Hobbit draws a
white border around the selected chat window when Settings opens or the
selection changes.

## Mining Stamina

Add `Mining Stamina` from the alert list, or enable it while loading the Mining
preset. Its alert threshold defaults to 20% and can be changed in the alert
settings.

The detector reads the yellow remaining section and dark blue depleted section
of the overhead mining stamina bar. Brief overlays such as `Critical swing!`
are tolerated while the bar position is tracked.

## Notes

AFK Hobbit does not click, type, or send input to RuneScape.

The RuneApps phone-monitor backend is not included, so its toolbar button is
hidden. The feedback button opens this repository's GitHub Issues page.

## Files

- `appconfig.json` - Alt1 manifest
- `index.html` - app page
- `scripts.bundle.js` - patched AFK Warden bundle
- `afk-hobbit-chat-select.js` - chat selector patch
- `assets/icon.svg` - app icon
- `THIRD_PARTY_NOTICES.md` - attribution and dependency notices
- `scripts.bundle.js.LICENSE.txt` - generated notices referenced by the bundle

## Credits

- [RuneApps AFK Warden](https://runeapps.org/apps/alt1/afkscape/appconfig.json)
- [SusAlert](https://github.com/Raphire/SusAlert)
- [Alt1 libraries](https://github.com/skillbert/alt1)
