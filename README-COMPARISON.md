# AFK Warden vs AFK Hobbit

This compares RuneApps AFK Warden with AFK Hobbit.

Old AFK Warden:

`https://runeapps.org/apps/alt1/afkscape/appconfig.json`

AFK Hobbit:

`https://hobbitcraft.github.io/afk-hobbit-alt1/appconfig.json`

## same

- Alt1 app
- `pixel,gamestate,overlay` permissions
- AFK Warden alerts
- presets
- alarm controls
- taskbar overlay setting
- the original AFK Warden layout

## changed

AFK Hobbit loads these external Alt1 scripts before the AFK Warden bundle:

- `https://www.unpkg.com/alt1@0.1.3/dist/base/index.js`
- `https://www.unpkg.com/alt1@0.1.3/dist/ocr/index.js`
- `https://www.unpkg.com/alt1@0.1.3/dist/chatbox/index.js`

The AFK Warden bundle is patched so its shared chat reader uses
`Chatbox.default` from that external chatbox script when it is available.

AFK Hobbit also loads `afk-hobbit-chat-select.js`. That file:

- adds a chat dropdown to the top bar
- adds a `Chat alerts` selector in Settings
- stores the chosen chat index in `localStorage` as `afkHobbit.chatIndex`
- applies the chosen detected chatbox as `reader.pos.mainbox`
- draws a white Alt1 rectangle around the selected chatbox when Settings opens
  or when the selected chat changes

AFK Hobbit adds a `Mining Stamina` alert. It reads the yellow and blue overhead
mining stamina bar and alerts below the percentage set in the alert settings.
The Mining preset has an option to add it with a 20% threshold.

The feedback button opens the AFK Hobbit GitHub Issues page. The RuneApps
phone-monitor backend is not included, so that button is hidden.

## not included

The public AFK Hobbit folder does not include the local debug server or runtime
logging scripts used during testing.

## use

Use the RuneApps version if the official AFK Warden chat alerts work for you.

Use AFK Hobbit if the bundled AFK Warden chatbox reader misses chat, or if you
want chat alerts to read from a specific detected chat window.
