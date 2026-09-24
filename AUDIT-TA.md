# SMV V64 — Source audit மற்றும் திருத்தங்கள்

அடிப்படை: நீங்கள் வழங்கிய **SMV LATEST.zip**. முந்தைய V63 ZIP மாற்றாகப் பயன்படுத்தப்படவில்லை. வழங்கப்பட்ட ஐந்து screenshots மற்றும் இந்த உரையாடலின் requirements அடிப்படையில் திருத்தப்பட்டது.

## சரிபார்ப்பின் வரம்பு

இது source audit + தனிமைப்படுத்தப்பட்ட logic tests முடிக்கப்பட்ட changed-files தொகுப்பு. Live Firebase console, production server logs, Razorpay merchant credentials அல்லது live payment செய்யப்படவில்லை. ஆகவே உண்மையான Firestore billed reads, Razorpay connect/verification நேரம் அல்லது 1–3 seconds செயல்திறன் **அளவிடப்பட்டதாகக் கூற முடியாது**. Browser runtime கிடைக்காததால் pixel-level mobile/desktop visual QA முடிக்கப்படவில்லை. ZIP-ல் hero/brand photos இல்லை; அவற்றின் existing paths பாதுகாக்கப்பட்டுள்ளன. Deploy செய்யப்பட்ட site-ல் visual check இன்னும் தேவை.

## கண்டுபிடித்தவை / மாற்றியவை

| பகுதி | பழைய source நிலை | V64 திருத்தம் |
|---|---|---|
| Consultation open/back | `location.href` மூலம் full-page reload; இரண்டு list renderers; புதிய renderer-ல் selection handler இல்லை | ஒரே in-document dedicated view; DOM/history navigation; cached list; selection handler இணைப்பு; பழைய `?view=consult` URL ஆதரவு |
| Review reads | List-ல் நல்ல lazy cache இருந்தாலும் profile popup தனியாக request மற்றும் Firestore fallback செய்தது | ஒரே in-flight request/cache; quota/API error-க்குப் பிறகு இரண்டாவது Firestore query fallback இல்லை |
| Reviews UI | Review button அளவு Select button-க்கு ஒத்திருக்கவில்லை | இரண்டும் 148×29 CSS px; main rating தொடர்கிறது; கீழ் review stars 14px, text 11px, name 10px; கீழ் numeric `/5` நீக்கம் |
| Banner requests | Home மற்றும் Customer dashboard தனித்தனி cache/request | ஒரே public request/cache + renderer; homepage focus auto-refetch நீக்கம்; countdown DOM-only |
| Customer banner | குறைந்த தகவல்; explicit theme/date parity இல்லை | Home போல artwork, shadow, price badge, date/time, countdown; Admin display mode தொடர்ந்து மதிக்கப்படுகிறது |
| Admin top buttons | பழைய broad button CSS மற்றும் duplicate styles பாதிப்பு | ஒரே row, மூன்றும் equal-width rectangular buttons; Questions / Answers / Refunds |
| Refresh buttons | `interface.js` source மீண்டும் உருவாக்கியது | உருவாக்கும் code நீக்கம்; error-specific Retry/Recover buttons தொடர்கின்றன |
| MutationObserver | Header label, workspace visibility, dashboard collapse observer | அந்த மூன்று observers நீக்கம்; explicit auth/navigation/render lifecycle calls பயன்படுத்தல் |
| Mobile hero | Bottom absolute content + `translateY(18px)` மூலம் overlap/overflow | இரண்டு சமமான rows; content கீழ் பாதியில்; text-க்கு ஏற்ப scene height; mobile compact typography; desktop content/image paths தொடர்கின்றன |
| Stylesheets | `smvastro.mjs` மீண்டும் `dashboard-typography.css` ஏற்றியது; banner inline stylesheet இருந்தது | இரண்டின் styles `smvastro.css`-ல் இணைக்கப்பட்டது; dynamic CSS loader நீக்கம். புதிய priority overrides/inline CSS சேர்க்கப்படவில்லை; பழைய global skins புதிய components-ஐ பாதிக்காத வகையில் source selectors scope செய்யப்பட்டுள்ளன |
| Offer themes | Generic + 7 seasonal themes; assets இந்த ZIP-ல் இல்லை | 16 lightweight animated SVG assets, Admin choices, shared detection; புதிய offers தானாக enable செய்யப்படவில்லை |
| Service worker | பழைய V51/V15 cache keys | V64 cache references; optional missing legacy image காரணமாக முழு cache installation தோல்வியடைவதைத் தவிர்த்தல் |

## Firebase reads — எது அதிகம் செலவிடுகிறது?

MutationObserver தானாக Firebase reads செலவிடாது. அது query/reload அழைத்தால் மட்டுமே indirect reads ஏற்படும். நீக்கப்பட்ட observers UI-only; அவற்றின் நீக்கத்தை Firebase read savings எனக் கணக்கிடவில்லை.

**நேரடியாகக் குறைக்கப்பட்ட reads:**

- `/astrologer/open-questions` முழு `smv_questions` collection படித்தது. இப்போது `status == available_to_astrologers` மட்டும் படிக்கும். ஏற்கெனவே இருந்த filtering/output logic தொடர்கிறது.
- Open Workflow ON/OFF மாற்றங்களிலும் தொடர்புடைய statuses மட்டும் query செய்யப்படும்.
- `/admin-data` எல்லா customers-ன் `smv_notifications` documents-ஐப் படித்து Admin notifications மட்டும் filter செய்தது. இப்போது `userId == ADMIN_UID` server query பயன்படுத்தப்படுகிறது.
- Manual promo code பொருந்தாத offer-க்கும் usage query நடந்தது. இப்போது cheap eligibility/price/code checks, priority sorting முடிந்த பிறகு தேவையான candidate usage மட்டும் படிக்கப்படுகிறது. Usage query-க்கு per-customer threshold limit உள்ளது.
- Home/dashboard banner shared cache: ஒரே valid cache காலத்தில் இரண்டு components திறந்தாலும் ஒரு request. Payment eligibility/price cache செய்யப்படவில்லை; server மறுபடியும் உறுதி செய்கிறது.
- Public astrologer/review/banner concurrent server queries ஒரே in-flight Firestore query பகிர்கின்றன. Existing short-lived server cache தொடர்கிறது.
- Customer SSE startup-ல் தேவையற்ற astrologer profile read நீக்கப்பட்டது. ஒரே server process-ல் ஒரே scoped listener பல tabs/connections-க்கு பகிரப்படுகிறது; கடைசி connection முடிந்தால் unsubscribe ஆகும்.
- சாதாரண Dashboard return-க்கு existing rendered view/cache பயன்படுத்தப்படுகிறது. Explicit force/live-change refresh-கள் stale data வராமல் தொடர்ந்து அனுமதிக்கப்படுகின்றன.
- Built-in welcome offer initialization/migration ஒவ்வொரு Admin Offers open-க்கும் read+write செய்யாது; successful initialization ஒரு process-க்கு ஒருமுறை.
- இல்லாத `publicQuestionPrice` element-க்காக startup Firestore read செய்வது நீக்கப்பட்டது.

**இன்னும் reads தேவைப்படும் இடங்கள்:**

- Admin full dashboard initial load: users, astrologers, questions, payments, private consultations, reviews/history. Existing totals/history completeness கெடாமல் இவை அமைதியாக truncate செய்யப்படவில்லை. பெரிய data volume-க்கு server pagination + aggregate counters அடுத்த improvement.
- Customer/Astrologer query listeners ஆரம்பத்தில் result documents படிக்கும்; change வந்தால் relevant section reload கூட இருக்கும். Shared listeners என்பது process-local; பல server instances-க்கு தனித்தனி reads இருக்கும்.
- புதிய phone registry-ல் பதிவு இல்லாத பழைய numbers-ஐ சரிபார்க்க legacy user scan உள்ளது. One-phone-one-account பாதுகாப்பை இழக்காமல் இதைத் தவிர்க்க ஒரு controlled registry backfill தேவை.
- Auth/role checks, payment ownership/amount/signature checks, offer eligibility/usage checks அவசியமானவை; இவை நீக்கப்படவில்லை.

கணக்கிடும் உதாரணம்: மொத்தம் Q questions, open O questions எனில் ஒரு Open Questions request-ன் returned-document reads Q-இலிருந்து O ஆகக் குறையும் (empty-query minimum/rule/index reads தனியே இருக்கும்). Production usage இல்லாமல் சதவீத savings கணிக்கவில்லை.

## Razorpay timing மற்றும் correctness

- Public verification: capture API ஏற்கெனவே `captured` response கொடுத்தால் உடனே மீண்டும் fetch செய்யும் redundant call நீக்கப்பட்டது; capture conflict/uncertainty இருந்தால் refetch தொடர்கிறது.
- Private verification: `authorized` என்ற நிலையையே paid ஆகக் குறித்தது கண்டுபிடிக்கப்பட்டது. இப்போது captured ஆக உறுதியான பிறகே paid write. Signature, ownership, order, amount மற்றும் currency checks பாதுகாக்கப்பட்டுள்ளன.
- Private create-order: independent offer quote + commission settings reads parallel ஆகின்றன.
- Public/retry/private checkout-ல் script readiness மற்றும் order request ஒரே நேரத்தில் நடைபெறலாம். Payment security checks தவிர்க்கப்படவில்லை.
- Backend `Server-Timing: app;dur=...` header சேர்க்கப்பட்டுள்ளது.
- `payment-timing.js` browser memory-ல் அதிகபட்சம் 60 stage records மட்டும் வைத்திருக்கும்; Firebase/telemetry requests இல்லை, tokens/payment IDs சேமிக்கப்படாது. Browser console-ல் `SMVPaymentTiming.report()` மூலம் API duration மற்றும் dashboard render duration பார்க்கலாம்; `SMVPaymentTiming.clear()` மூலம் clear செய்யலாம்.
- இந்த அளவுகள் customer UPI/bank approval நேரத்தையும் Razorpay modal உண்மையில் paint ஆன நேரத்தையும் தனியே அளவிடுவதில்லை. High-speed internet மட்டும் backend cold start/Firestore/Razorpay latency-ஐ அகற்றாது.
- Existing Render backend URL இந்த latest source-ல் உள்ளது; hosting migration இந்த மாற்றத்தில் செய்யப்படவில்லை. 15-second auto retry logic மற்றும் refund/RRN code மாற்றப்படவில்லை.

## பாதுகாக்கப்பட்டவை

Horoscope calculation files, refund-service.js, Firestore rules ஆகியவை original ZIP-உடன் byte comparison-ல் மாறவில்லை. Customer/Astrologer/Admin roles, manual astrologer approval, question/answer approval, offer eligibility/priority, retry pricing, commission, refund/RRN, Google Form sync ஆகிய business flows திட்டமிட்டு நீக்கப்படவில்லை. அனைத்தும் live end-to-end tested எனக் கூறப்படவில்லை.

## Tests

- 9 JavaScript/module files: `node --check` pass.
- index.html-ல் 27 executable inline script blocks parse pass.
- 16 SVG files XML parse pass.
- Shared banner cache concurrent/repeat requests: ஒரு request.
- Shared reviews concurrent/repeat open: ஒரு request.
- DOM stub navigation: 4 consultation/back cycles; header/footer isolation; legacy URL cleanup pass. இது real-browser visual test அல்ல.
- Private verification mocks: captured, authorized→capture, capture pending/failure, invalid signature, wrong amount cases pass. Pending/invalid payment-க்கு paid write இல்லை.
- Modified UI sources-ல் active `new MutationObserver` = 0.

## Deploy மற்றும் samples

இந்த ZIP-ல் **மாற்றிய/புதிதாகச் சேர்த்த கோப்புகள் மட்டும்** உள்ளன. Existing full project மீது அதே relative paths-ல் replace/add செய்யவும்; முழு project-ஐ இந்த ZIP மட்டும் கொண்டு மாற்ற வேண்டாம். Frontend files மற்றும் server.js/dashboard-events.js இரண்டையும் deploy செய்ய வேண்டும். பழைய `dashboard-typography.css` file unused ஆக இருக்கலாம்; main page அதை load செய்யாது.

`samples/festival-banners.html` திறந்தால் 16 animated SVG banner samples கிடைக்கும். அவை sample prices மட்டும்; offer enable/payment/Firebase action செய்யாது. Reduced-motion setting மதிக்கப்படுகிறது. Welcome, General, Pongal, Diwali, Navaratri, Dasara, Ayudha Pooja, Shivaratri, Tamil New Year, Vinayagar Chaturthi, Karthigai Deepam, Thaipusam, New Year, Onam, Christmas, Eid சேர்க்கப்பட்டுள்ளன.

Deployment acceptance check: Mobile Consultation→Back→Consultation, Select Astrologer, repeated Review toggle, Admin three buttons, Home/Customer banner dates, hero upper-half clearance ஆகியவற்றைச் சரிபார்க்கவும். Razorpay test-mode order→bank success→verification→dashboard timings தனியாக பதிவு செய்து production performance முடிவு எடுக்கவும்.
