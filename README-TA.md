# Public Question V72 — deploy வழிமுறை

இவை latest V71 public-credit source-ஐ அடிப்படையாகக் கொண்ட **changed files**. முழு app-ன் மற்ற files ஏற்கெனவே உள்ளபடி தேவை. Horoscope standalone folder-உடன் கலக்க வேண்டாம்.

## மாற்ற வேண்டியவை

| File | இடம் |
|---|---|
| `server.js` | Existing backend root-ல் replace |
| `public-question-workflow.js` | **புதிய file**; server.js அருகில் கட்டாயம் சேர்க்கவும் |
| `smvastro.mjs` | Existing frontend root-ல் replace |
| `index.html` | Existing frontend root-ல் replace; frontend cache version புதுப்பிக்கப்பட்டுள்ளது |
| `public-question-workflow.test.js` | Local tests மட்டும்; runtime-க்கு தேவையில்லை |

Backend dependencies, Firestore rules, existing CSS மாற்றங்கள் தேவையில்லை. Production deploy-க்கு முன் existing files backup எடுத்துக்கொள்ளவும். Backend-ஐ புதிய module உடன் deploy செய்தபின் frontend-ஐ deploy செய்யவும்.

```sh
node --check server.js
node --check smvastro.mjs
node --test public-question-workflow.test.js
```

## Final flow

**ON:** Verified paid → Admin-ல் AUTO APPROVED / OPEN → approved astrologers-க்கு open list → ஒருவர் transaction-ல் claim → Admin-ல் claimed/unanswered → answer customer-க்கு உடனே available → Admin history.

**OFF:** Verified paid → Admin waiting → Admin approve/allocate → அந்த astrologer claim → answer submitted → Admin answer approval → customer-க்கு available → Admin history.

Switch மாற்றம் இன்னும் claim செய்யாத questions-ஐ மாற்றும். ஏற்கெனவே claimed question-ன் approval mode நிலையாக இருக்கும். Auto question-ஐ Admin வெளிப்படையாக allocate செய்தால் manual approval mode; ஏற்கெனவே claimed auto question-ஐ reallocate செய்தால் அதன் auto mode retained.

Auto answer-க்கு `SUBMITTED` மற்றும் தனியாக `Waiting for customer view` message. “Waiting for Admin Approval” இல்லை. Credited answer-க்கு edit control இல்லை.

## Commission — இரண்டு நேரங்கள் வேறு

FAQ-ன் 24–48 hours என்பது **பதில் கிடைப்பதற்கான நேரம்**. Commission timer என்பது **பதில் customer-க்கு available ஆன நேரத்திலிருந்து 24 hours**.

- Customer `MARK ANSWER VIEWED` அழுத்தினால் உடனே credit.
- அழுத்தாவிட்டால், login செய்யாவிட்டாலும் 24 hours முடிந்தபின் backend scheduler credit செய்யும்.
- Manual flow-ல் Admin answer approval நேரமே timer start.
- Auto flow-ல் first successful answer publication நேரமே timer start.
- Answer edit timer-ஐ reset செய்யாது; customer view / credit / 24-hour deadline வந்ததும் edit lock.
- Automatic credit “customer viewed” என்று போலியான timestamp எழுதாது.
- View, scheduler, Admin retry ஒரே transactional settlement-ஐப் பயன்படுத்துகின்றன.

## Scheduler — முக்கியமான deployment step

Backend running நிலையில் startup sweep + 5-minute timer உள்ளது. Sleeping/restarting hosting-க்காக external scheduler-ஐயும் configure செய்யவும்.

1. நீளமான random secret உருவாக்கி backend environment-ல் `PUBLIC_SETTLEMENT_CRON_SECRET` ஆக அமைக்கவும். Source code-ல் secret எழுத வேண்டாம்.
2. `scheduler/` folder-ல் Cloudflare Worker deploy செய்யவும். `wrangler.jsonc` ஒவ்வொரு 5 நிமிடத்திற்குமான schedule கொண்டுள்ளது.
3. Worker secrets:

```sh
npx wrangler secret put PUBLIC_SETTLEMENT_URL
npx wrangler secret put PUBLIC_SETTLEMENT_CRON_SECRET
npx wrangler deploy
```

URL value: `https://YOUR-BACKEND/internal/public-settlement/run`  
Secret value: backend-ல் வைத்த **அதே** secret.

Cloudflare Worker-க்கு பதிலாக authenticated HTTP POST செய்யக்கூடிய existing scheduler-ஐயும் பயன்படுத்தலாம். `Authorization: Bearer <secret>` header கட்டாயம்.

24 hours-க்கு முன்னால் automatic credit இல்லை. Due ஆனதும் அடுத்த successful scheduled run-ல் credit: சாதாரணமாக 0–5 நிமிட scheduling delay; backend outage/backlog இருந்தால் மேலும் தாமதமாகலாம். Customer browser திறந்திருப்பது தேவையில்லை. Scheduler logs-ல் `checked`, `credited`, `review` பார்க்கலாம்.

**இந்தத் தொகுப்பு live deployment அல்லது cron activation செய்யவில்லை.**

## பழைய questions

முதல் runs-ல் பழைய answered public questions 50 records/page என்ற முறையில் ஒருமுறை migrate ஆகும். Approval / first-availability timestamp தெரிந்தால் due time உருவாக்கப்படும். Original நேரமே இல்லாவிட்டால் paidAt/updatedAt வைத்து ஊகிக்காது; Admin history-ல் settlement review message காட்டும்.

State document: `smv_settings/publicSettlementBackfillV72`. Migration முடிந்தபின் historical full scans மீண்டும் நடக்காது. Due query அதிகபட்சம் 100 records/run. ஏற்கெனவே credit ஆன earning, அல்லது பழைய ledger மட்டும் commit ஆன earning மீண்டும் உருவாக்கப்படாது. ஏற்கெனவே duplicate historical ledgers இருந்தால் பணத்தை தானாக delete/adjust செய்யாது; Admin reconciliation தேவை.

Deploy பிறகு Razorpay **test mode** accounts மூலம் ON/OFF மற்றும் scheduler endpoint smoke test செய்யவும். இந்தப் பணியில் production Firebase data அல்லது உண்மையான payment/commission மாற்றப்படவில்லை.
