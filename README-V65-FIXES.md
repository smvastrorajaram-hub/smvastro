# SMV ASTRO V65 — Resend + Firestore index + Admin role fix

## What changed
- Backend health version: `2026-08-17-v65-resend-firestore-index-fix`
- Public announcements no longer use `where`/`orderBy`; filtering/sorting happens in Node so a Firestore composite index is not required.
- Admin appointments no longer use `orderBy`; sorting happens in Node.
- Admin access accepts the configured `ADMIN_UID` **or** a Firestore `smv_users/{uid}` profile with `role: "admin"` (and Firebase token admin/role claims when present).
- Frontend Admin Dashboard uses the same role-aware check.
- Added Admin Dashboard **SEND TEST EMAIL** button calling `/admin/test-email`.
- Contact and appointment email failures now return the provider's safe error message instead of a generic message.
- Resend remains the primary email provider over HTTPS. Gmail SMTP is not required on Render Free.

## Render environment variables
Required:
- `ADMIN_EMAIL`
- `RESEND_API_KEY`

Optional:
- `RESEND_FROM` — default is `onboarding@resend.dev`.
- `ADMIN_UID` — optional override if the original Admin UID is not the correct one.

For production email to arbitrary customer/admin addresses, verify a sending domain in Resend and set `RESEND_FROM` to an address on that verified domain. The Resend onboarding sender is intended for testing and may only deliver to the account's permitted recipient.

## Test email
1. Deploy this backend.
2. Login to the Admin Dashboard.
3. Open **Email System Test**.
4. Press **SEND TEST EMAIL**.
5. Check the Admin inbox.

If the test fails, the website now displays the backend/Resend error so the next fix can be exact.
