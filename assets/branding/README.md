# Shared profile and site icons

`profile.png` is the 1024 x 1024 TikTok profile deliverable and the only image source.
All browser, Apple home-screen and Android icons are built locally from this file:

```
python scripts/build_brand_icons.py
```

Replacing the square source and rebuilding updates all ten active page headers,
the web app manifest and content-versioned icon links. Commit and deploy those
generated files together. Icon changes do not change game state or authentication.
Existing installed icons are refreshed by the operating system; an iOS shortcut
may need to be added again. Do not promise an instant update of installed icons.

TikTok account: `@fatihevrili`. This is not an active TikTok account connection.
There is no avatar scraping, external avatar proxy or scheduled synchronization.
On 2026-10-20 the public profile request returned a TikTok WAF challenge instead
of profile data. Reliable automatic avatar synchronization requires an approved
TikTok app, owner authorization for `user.info.basic`, server-side token handling
and deployment of the returned avatar as these local icons. No credentials belong
in public HTML, this repository or browser storage.

Official user-info API:
https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info

## Artwork

Created with the built-in Imagegen tool on 2026-10-20. No TikTok logo or user's
existing landscape photograph was modified. Generated master is retained outside
the repository; the deliverable here is downscaled to 1024 square.

Prompt: Create one square sports avatar for AI Football Live / Doruk Arenasi,
legible as a tiny favicon: bold golden mountain peak, white football, substantial
golden shield on midnight navy; crisp geometric shapes, no text, centered with
space for circular profile cropping. Premium flat sports broadcast identity.
