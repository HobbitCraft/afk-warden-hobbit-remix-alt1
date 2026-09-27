# AFK Warden vs AFK Warden Hobbit Remix

This compares RuneApps AFK Warden with AFK Warden Hobbit Remix.

Old AFK Warden:

`https://runeapps.org/apps/alt1/afkscape/appconfig.json`

AFK Warden Hobbit Remix:

`https://hobbitcraft.github.io/afk-warden-hobbit-remix-alt1/appconfig.json`

## same

- Alt1 app
- `pixel,gamestate,overlay` permissions
- AFK Warden alerts
- presets
- alarm controls
- taskbar overlay setting
- the original AFK Warden layout

## changed

AFK Warden Hobbit Remix loads these external Alt1 scripts before the AFK Warden
bundle:

- `https://www.unpkg.com/alt1@0.1.3/dist/base/index.js`
- `https://www.unpkg.com/alt1@0.1.3/dist/ocr/index.js`
- `https://www.unpkg.com/alt1@0.1.3/dist/chatbox/index.js`

The AFK Warden bundle is patched so its shared chat reader uses
`Chatbox.default` from that external chatbox script when it is available.

AFK Warden Hobbit Remix also loads
`afk-warden-hobbit-remix-chat-select.js`. That file:

- adds a chat dropdown to the top bar
- adds a `Chat alerts` selector in Settings
- stores the chosen chat index in `localStorage` as
  `afkWardenHobbitRemix.chatIndex`
- migrates the previous `afkHobbit.chatIndex` setting when present
- applies the chosen detected chatbox as `reader.pos.mainbox`
- draws a white Alt1 rectangle around the selected chatbox when Settings opens
  or when the selected chat changes
- applies the selected chatbox to the Chatbox alert editor preview
- refreshes the Chatbox editor preview once per second
- uses standard and supplemental message colours in both running alerts and
  the editor, including green and red soul-event messages
- finds player-title and message colours that are not in the old fixed list
- limits each preview refresh to one OCR pass, reuses unchanged images, and
  stops refreshing closed editor windows
- opens the Chatbox editor preview at the newest lines

AFK Warden Hobbit Remix includes the AFK Warden `style.css` rules locally.
AFK Warden popup windows request that relative file directly, including the
add-alert list and Chatbox editor. Interface image URLs in the stylesheet point
to their RuneApps-hosted copies.

AFK Warden Hobbit Remix adds a `Mining Stamina` alert. It reads the yellow and
blue overhead mining stamina bar and alerts below the percentage set in the
alert settings. The Mining preset has an option to add it with a 20% threshold.

The feedback button opens the AFK Warden Hobbit Remix GitHub Issues page. The
RuneApps phone-monitor backend is not included, so that button is hidden.

## not included

The public AFK Warden Hobbit Remix folder does not include the local debug
server or runtime logging scripts used during testing.

## use

Use the RuneApps version if the official AFK Warden chat alerts work for you.

Use AFK Warden Hobbit Remix if the bundled AFK Warden chatbox reader misses
chat, or if you want chat alerts to read from a specific detected chat window.
