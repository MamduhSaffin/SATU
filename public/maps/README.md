# TEMAN Haramain offline map packs

The generated `makkah.pmtiles` and `madinah.pmtiles` files are compact regional extracts of the Protomaps OpenStreetMap-derived basemap.

- Source build pinned for this prototype: `https://build.protomaps.com/20260925.pmtiles`
- Format: PMTiles v3 vector tiles
- Maximum zoom: 15
- Makkah bounds: 39.7600,21.3600,39.9000,21.4900
- Madinah bounds: 39.5400,24.4000,39.6800,24.5300
- Runtime renderer: MapLibre GL JS + `pmtiles` browser protocol
- Data attribution shown in-app: OpenStreetMap contributors / Protomaps

These packs are self-hosted with the TEMAN web app. Users may download either regional file into browser Cache Storage before travel. The service worker implements HTTP byte-range responses from the cached full archive so PMTiles can continue reading tiles when the device is offline.

This map layer is orientation support, not a certified routing engine. TEMAN's Safety Card, saved coordinates, compass/distance fallback and human assistance remain available independently of the map pack.
