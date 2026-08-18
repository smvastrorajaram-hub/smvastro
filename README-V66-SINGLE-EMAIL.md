# SMV ASTRO V66 — Single Email Contact Fix

This version is for Resend testing without a custom domain.

Render environment variables:
- `ADMIN_EMAIL=astrorajaraman@gmail.com`
- `RESEND_API_KEY=your_resend_key`
- `RESEND_FROM=onboarding@resend.dev`
- Optional: `RESEND_TEST_RECIPIENT=astrorajaraman@gmail.com`

The Contact Form sends to the Resend account/test recipient (normally the same `astrorajaraman@gmail.com`) and sets the visitor email as Reply-To. Do not put the Resend API key in the website frontend.

Backend version: `2026-08-17-single-email-contact-v66`.
