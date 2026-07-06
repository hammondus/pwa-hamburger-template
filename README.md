# SAP
Southern Airlines App

A PWA App: Go server, htmx navigation, and a draggable hamburger menu.

## Run

```sh
go build -o sap . && ./sap          # serve the embedded files on :8080
go run . -dev                                 # development: serve web/ from disk (edit + refresh, no rebuild)
go run . -dev -addr :3000                     # different port
```

## How it works

- **App shell.** `web/index.html` is the only full page. The Go server returns
  it for every app route (`/dashboard`, `/profile`, ...), and requests that
  match a real file under `web/` are served as-is.
- **htmx navigation.** Each menu link has `hx-get` pointing at a fragment in
  `web/pages/`; htmx swaps it into `<main>` and updates the URL
  (`hx-push-url`). No page reload, so no flash, and the drawer's slide-closed
  animation plays while the content changes.
- **Vanilla behaviour.** `web/js/app.js` owns the drawer open/close, the
  draggable hamburger button (position kept in `localStorage` as fractions of
  the screen), and the small glue that syncs the title and active menu item.
- **PWA.** `web/manifest.webmanifest` + icons make it installable;
  `web/sw.js` is a network-first service worker, so you always get fresh files
  online and the whole app (shell + fragments) works offline.
- **Single binary.** `//go:embed all:web` in `main.go` bakes the site into the
  executable — deploying is copying one file.

## Adding a screen

1. Create `web/pages/<name>.html` containing `<section class="screen">…</section>`.
2. Add a link in the nav list in `web/index.html`:
   `<a class="nav-link" href="/<name>" hx-get="/pages/<name>.html" hx-push-url="/<name>" data-title="<Title>">…</a>`
3. Add `/pages/<name>.html` to `PRECACHE` in `web/sw.js` and bump `VERSION`
   so it works offline.

## HTTPS / testing on a phone

The service worker (offline + PWA install) only works on `localhost` or over
HTTPS. For phones on the LAN this project uses mkcert: if `certs/cert.pem` and
`certs/key.pem` exist, the server also listens on HTTPS (`-tlsaddr`, default
`:8443`).

```sh
mkcert -cert-file certs/cert.pem -key-file certs/key.pem \
  192.168.1.110 192.168.8.103 localhost 127.0.0.1 ::1   # rerun with new IPs as needed
```

Phone setup (once): AirDrop `mkcert-rootCA.crt` (a copy of
`$(mkcert -CAROOT)/rootCA.pem`) to the phone, install it via Settings →
General → VPN & Device Management, then enable full trust in Settings →
General → About → Certificate Trust Settings. The phone trusts the *CA*, so
regenerated certificates (e.g. adding an IP) need no phone changes.

## Notes
- When a screen later needs live data, move it from a static fragment to a Go
  handler that renders the same fragment HTML — the htmx side doesn't change.
