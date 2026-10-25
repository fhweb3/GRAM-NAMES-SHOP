# GRAM NAMES SHOP

A responsive public Telegram username inventory with keyword search, category/status/length filters, Telegram inquiry buttons, admin login, CSV import, archive/restore, and category management.

## Important
This project is source code, not a live deployed website. To make the admin dashboard secure, connect it to Supabase and apply the SQL schema below. Do not use a service-role key in the browser.

## Included files
- `index.html` — public website and admin dashboard UI
- `styles.css` — responsive dark theme
- `app.js` — search, filters, admin CRUD, CSV import, archive and restore
- `config.js` — public Supabase URL and anon/publishable key placeholders
- `supabase-schema.sql` — database tables, constraints and Row Level Security
- `sample.csv` — import template

## 1. Create the database/auth
1. Create a project at https://supabase.com/ (free tier).
2. Open SQL Editor and run all of `supabase-schema.sql`.
3. In Authentication settings, disable public signups after creating your admin account. Create your admin user in Authentication > Users.
4. Copy the admin user's UUID and run `insert into public.admins (user_id) values ('YOUR-AUTH-USER-UUID');` in SQL Editor.
5. In Project Settings > API, copy Project URL and anon/publishable key into `config.js`.
   - URL goes in `SUPABASE_URL`.
   - anon/publishable key goes in `SUPABASE_ANON_KEY`.
   - Never put the `service_role` secret in browser code.
6. Set a strong unique password for the admin account and enable MFA in Supabase Auth if available for your project.

## 2. Test locally
Because this uses browser modules/CDN and fetch requests, serve the folder with a local static server instead of opening `index.html` directly. For example, with Python installed:
`python -m http.server 8000`
Then visit `http://localhost:8000`.

## 3. Deploy free
Push this folder to a GitHub repository, then create a Cloudflare Pages project connected to the repository. Use the project root as the build directory and leave the build command blank for this static site. Deploy. Configure the Supabase URL and anon key in `config.js` before committing the public configuration.

## Features and rules
- Public cards show username, category, status, price, and inquiry button to `https://t.me/fhvip3`.
- Homepage channel card links to `https://t.me/gram_names`.
- Keyword search checks username and category text.
- Category, status, and character-length filters can be combined.
- Exactly 5-character usernames appear under the special `5 Characters` parent folder in the category browser; 6+ character usernames appear in normal main categories. The category column stored in CSV remains the assigned category.
- CSV headers: `username,category,status,price`. Status values must be exactly `Available`, `Offer Received`, or `Sold`. Empty price is allowed. Duplicate usernames are case-insensitively detected; import can skip or update existing records.
- Archived usernames are hidden from public listings and public counts; admins can restore them.
- Public inventory data is visible to everyone by design. Never store private notes or confidential customer information in these public tables.
- The “15K+” text is promotional copy; actual counts are calculated from database records.

## Limitations
- Free-tier provider quotas, pausing rules, and terms can change. Free hosting is not a guarantee of perpetual uptime.
- The UI links to Telegram usernames supplied by the site owner. Confirm the handles are correct before launch.
