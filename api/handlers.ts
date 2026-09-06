/**
 * Drop-in shape for a production serverless function (Netlify / Vercel / Cloudflare).
 * Locally, Vite middleware in server/vite-plugin.ts is enough.
 *
 * Production MUST use a server-side function too — Vite middleware does not
 * ship with a static host. Keep SETLISTFM_API_KEY in the host's env, not VITE_.
 */
export { handleAttended, handleBirthdays, handleUpcoming } from "../server/handlers";
