# SMV ASTRO — September 19 fixes

Based on the supplied V27 ZIP. This package is not deployed automatically.

## Install

1. Replace the frontend files `index.html`, `privacy.html`, `terms.html`, and `sw.js`; add `layout-sep19.css` beside the existing stylesheets. Keep all other assets and existing stylesheets.
2. Replace `transit_panchang.js` on the Node backend and redeploy/restart it. Uploading only the HTML/CSS cannot fix the Tamil date returned by the backend.
3. Reload the website after deployment. The service-worker cache version has been updated.

## Changes

- September 19, 2026 now displays Purattasi 2 for the India-time calendar. The old engine assigned the September 17 astronomical solar ingress to the first civil day. The requested published calendar begins Purattasi on September 18. A documented, year-specific civil-month boundary is applied; Swiss planetary positions are unchanged. This is not a universal one-day subtraction or a claim that all calendar conventions agree.
- Source for the September 18 civil start: https://tamil.indianexpress.com/lifestyle/purattasi-2026-saturday-thaligai-worship-method-12549782
- The preceding and following month boundaries remain continuous; an after-sunset ingress no longer produces a missing Tamil date on its civil day.
- Location suggestions use black text on white with a neutral hover/focus state.
- Contact panels keep the phone link and official WhatsApp SVG. WhatsApp shows +91 8072973399 and opens a chat with the draft “Hi, I want to know more about your services.” The user sends the message. Facebook, YouTube and Instagram are removed only from these panels; footer markup is unchanged.
- At desktop widths of 1024px and above, summary cards use compact horizontal content, analysis tables use available width, and the three core charts appear alongside one another with larger labels. Crowded chart cells can scroll to retain every planet label. Mobile chart and analysis sizing rules are unchanged.

## Verification

- 22 automated checks passed, including nine new real-Swiss-Ephemeris calendar cases: September 16–20, October 17–18, daily times, and birth before sunrise.
- 28 inline scripts passed JavaScript syntax checks. Footer identity and scoped contact changes were checked.
- Browser visual verification was not completed: the Chromium download failed in this environment. Review the deployed desktop layout and existing mobile layout before release.

Run after installing project dependencies:

    node --test tests/*.mjs tests/*.cjs

No authentication, payment, planetary-calculation or footer-social logic was changed.
