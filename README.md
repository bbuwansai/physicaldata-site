# copythatlabs.com

Marketing site for Copy That Labs ("Fast-tracking the path to general-purpose robots"): complete human task episodes for robot learning, with the state between decisions annotated. One static page plus one serverless function, no build step.

- `index.html` is the whole site (styles and scripts inline, fonts from Google Fonts).
- `api/contact.js` receives the contact form and emails it to `CONTACT_TO` (set in Vercel, never in the page). Uses Resend when `RESEND_API_KEY` is set, otherwise FormSubmit.
- `vercel.json` sets clean URLs and a couple of security headers.
- `brand/` holds the logo mark and lockup.

## Deploy

Pushes to `main` deploy to production on Vercel. Domains: copythatlabs.com (www redirects to apex).
