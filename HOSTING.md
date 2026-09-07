# Deploying to hosting.com shared Linux

This project runs as one Node.js application: the bundled server handles the
`/api/*` endpoints and serves the built React site. The cPanel Node.js Selector
keeps it running through Phusion Passenger.

## 1. Build the upload package locally

From the project directory:

```powershell
npm install
npm run build:hosting
```

The upload-ready files are written to `hosting-upload/`:

```text
hosting-upload/
  app.cjs
  dist/
  package.json
  .env.example
```

Upload the contents of this directory, not the enclosing
`hosting-upload` directory.

## 2. Upload to the application root

In cPanel File Manager, create the directory:

```text
/home/YOUR_CPANEL_USER/apps/music
```

This directory is intentionally outside `public_html`. Upload the four items
from `hosting-upload/` into it. Zipping those items locally, uploading the zip,
and extracting it in File Manager is usually fastest.

The resulting server layout must have `app.cjs` and `dist/` directly inside
`apps/music/`. Do not upload `node_modules`, the source tree, the local `.env`,
or `.cache`.

## 3. Create the Node.js application

In **cPanel → Setup Node.js App → Create Application**, use:

- **Node.js version:** `20.20.2`
- **Application mode:** `Production`
- **Application root:** `apps/music`
- **Application URL:** `music.dougkarda.com`
- **Application URL path:** leave blank so the app runs at `/`
- **Application startup file:** `app.cjs`

Add these environment variables using **Add Variable**:

- `SETLISTFM_API_KEY`
- `SETLISTFM_USER_ID`
- `MUSICBRAINZ_USER_AGENT`
- `TICKETMASTER_API_KEY`

Use the corresponding values from the local `.env`. Never upload or expose
that local file. After the files and variables are present, click **Create**.
The bundled startup file has no external runtime dependencies, so **Run NPM
Install** is not required.

### If the subdomain returns 403

On this hosting account, the Node.js Selector may not create the Passenger
`.htaccess` file automatically. Create `.htaccess` in the
`music.dougkarda.com` document-root directory with:

```apache
# CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerEnabled on
PassengerAppRoot "/home/YOUR_CPANEL_USER/apps/music"
PassengerBaseURI "/"
PassengerNodejs "/home/YOUR_CPANEL_USER/nodevenv/apps/music/20/bin/node"
PassengerAppType node
PassengerStartupFile app.cjs
# CLOUDLINUX PASSENGER CONFIGURATION END
```

Set the file permission to `644`, confirm the Node path against the activation
command shown by the Node.js Selector, and restart the application.

## 4. Enable HTTPS

In **cPanel → SSL/TLS Status**, include `music.dougkarda.com` in AutoSSL and run
AutoSSL if it does not already show a valid certificate. In **Domains**, enable
**Force HTTPS Redirect** for the subdomain.

## 5. Verify the deployment

Open these URLs:

- `https://music.dougkarda.com/`
- `https://music.dougkarda.com/birthdays` — confirms React deep links work
- `https://music.dougkarda.com/api/birthdays`
- `https://music.dougkarda.com/api/setlistfm/attended`

The first request to an empty or expired API cache can start a background fill.
Reload the relevant page after it finishes.

## Updating the site

1. Run `npm run build:hosting` locally.
2. Stop the application in **Setup Node.js App**.
3. Replace `app.cjs` and `dist/` with the new contents of `hosting-upload/`.
4. Start or restart the application.

Leave the server's `.cache/` directory in place during normal deployments.

## Clearing API caches

Stop the application, delete only the cache file that needs refreshing, and
start the application again:

- Attended: `.cache/setlistfm-attended.json`
- Birthdays: `.cache/musicbrainz-birthdays.json`
- Releases: `.cache/musicbrainz-release-groups.json`
- Upcoming: `.cache/ticketmaster-ny-events.json`

Stopping first matters because the running process also keeps these responses
in memory.

## Troubleshooting

- **503 after Create:** confirm that `app.cjs` is directly in `apps/music/`,
  the startup filename is exactly `app.cjs`, and Node `20.20.2` is selected.
- **Homepage works but routes return 404:** confirm the new `app.cjs` was
  uploaded; it supplies the React Router fallback.
- **API says it is not configured:** recheck the cPanel environment variable
  names and values, then restart the application.
- **Caches never persist:** ensure `apps/music/` is writable by the account.
- **Other startup errors:** inspect the Passenger/application log shown by the
  Node.js Selector and restart after correcting the reported issue.
