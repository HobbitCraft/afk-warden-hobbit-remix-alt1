# Third-party notices

## AFK Warden

`scripts.bundle.js` is a modified copy of the RuneApps AFK Warden browser
bundle:

https://runeapps.org/apps/alt1/afkscape/appconfig.json

The original app, interface code, embedded reader assets, and default alert
behavior are credited to Skillbert and RuneApps. The generated notices
referenced by that bundle are preserved in `scripts.bundle.js.LICENSE.txt`.

The distributed AFK Warden app does not include a general software licence.
This repository therefore does not apply a new licence to the AFK
Warden-derived bundle.

## SusAlert

The chatbox-loading and selected-chat outline behavior was informed by
Raphire/SusAlert:

https://github.com/Raphire/SusAlert

SusAlert is released under the MIT License:

Copyright (c) 2019 Jeffrey Drost

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Alt1 libraries

The app loads version 0.1.3 of the `alt1` package published by Skillbert,
including the `alt1/base`, `alt1/ocr`, and `alt1/chatbox` browser builds:

https://github.com/skillbert/alt1

The published npm package does not declare a licence in its package metadata.
It is used here for interoperability with Alt1 Toolkit.

## RuneApps hosted resources

AFK Hobbit loads AFK Warden stylesheets, alarm sounds, popup styles, and the
optional speech endpoint from `runeapps.org` at runtime. Those files are not
redistributed in this repository.

RuneScape and its visual assets are trademarks or copyrighted works of Jagex
Ltd. This project is an unofficial fan utility and is not endorsed by Jagex,
RuneApps, or the SusAlert maintainers.
