# Public Question root-cause audit

## கண்டறிந்தவை மற்றும் source fixes

| Root cause | திருத்தம் |
|---|---|
| Customer view தனி counter ledger; cron தனி deterministic ledger; race-ல் double credit சாத்தியம் | எல்லா credit paths-க்கும் ஒரே transaction; existing ledger recovery மற்றும் duplicate detection |
| Auto answer edit approval timestamp/due time-ஐ reset செய்தது | Immutable first `answerAvailableAt`; edits due time மாற்றாது |
| Reopen action answered question-ஐ admin_approved ஆக்கி customer answer மறைத்தது | Published answer visible ஆகவே இருக்கும்; edit mode மட்டும் மாறும் |
| Global ON/OFF switch submission நேரத்தில் மறுபடியும் படிக்கப்பட்டதால் claimed question flow மாறியது | Claimed question-ன் approval snapshot பயன்படுத்தப்படுகிறது |
| Open-list query பழைய allocationStatus-ஐ ஏற்றது; claim route ஏற்கவில்லை | Paid + unassigned + open status என்ற ஒரே eligibility; switch/ownership transaction-ல் read |
| Auto claimed question-க்கு manual approval timestamp இல்லாததால் reallocation தடை | Unanswered paid assigned question-க்கு transactional reallocation |
| Auto Admin cards-ல் rescue controls மறைக்கப்பட்டிருந்தன | Reallocate / allocate / refund / Admin answer controls retained; 24h unanswered warning |
| Admin allocation read→write இடையில் claim நடக்க முடிந்தது | Allocation/reallocation question transaction-ல்; overwrite செய்ய explicit Reallocate தேவை |
| ON/OFF batch 500+ writes அல்லது concurrent claim-ஐ overwrite செய்யும் வாய்ப்பு | 100-record pages, ஒவ்வொரு record-க்கும் current switch/claim guard transaction |
| Open questions 50-ல் மட்டும் நின்றன | Cursor-based MORE OPEN QUESTIONS; தேவையானபோது மட்டும் அடுத்த page read |
| Admin history 50 entries-ல் வெட்டப்பட்டது | ஏற்கெனவே fetched history records அனைத்தும் DOM-ல்; answer history details |
| Browser submit-ல் redundant question reads மற்றும் notification write | Loaded question feedback + server-owned notification; full/targeted handlers இரண்டும் திருத்தம் |
| 0% commission `|| 20` காரணமாக மாறியது | Nullish fallback; valid zero retained |
| Automatic credit இருந்தாலும் withdrawal eligibility customerViewedAt கேட்டது | Public credited commission view flag இல்லாமலும் சேரும் |
| Due date இல்லாத historical answers sweep-க்கு வரவில்லை | One-time resumable backfill; unknown timestamps Admin review |
| Invalid due records முதல் page-ஐ நிரந்தரமாக occupy செய்தன | Review flag செய்து due queue-லிருந்து நீக்கம் |
| Sleeping backend-ல் in-process timer மட்டும் போதாது | Authenticated scheduler endpoint + deploy செய்யக்கூடிய cron Worker |

## Firebase reads

புதிய MutationObserver, browser polling அல்லது client Firestore listener சேர்க்கப்படவில்லை. MutationObserver தானாக Firebase reads செய்யாது; அதன் callback database query-ஐ trigger செய்தால்தான் quota பாதிக்கும். இங்கே navigation/rendering DOM-ல் மட்டுமே நடக்கிறது.

Public submit browser pre-read/post-read நீக்கப்பட்டது. Settlement due query மட்டும் 5-minute run-ல்; empty query-க்கும் Firebase billing விதிகள் பொருந்தும். ஒரு credit-க்கு question + canonical ledger + bounded prior-ledger lookup transaction reads தேவை; இது duplicate payout தவிர்க்கும் correctness check. Backfill temporary; migration complete ஆனபின் historical scan இல்லை. Existing dashboard listeners இந்த scoped fix-ல் புதிதாக அதிகரிக்கப்படவில்லை.

Production console usage access இல்லாததால் “N reads சேமிக்கப்பட்டது” என்ற அளவு கூறப்படவில்லை. Existing Admin questions-data endpoint முழு history fetch செய்வது தொடர்கிறது; அதை pagination ஆக மாற்றுவது தனி API/UI migration தேவைப்படும், இந்த public-flow fix-ல் அதன் data contract மாற்றப்படவில்லை.

## Verification

- 17 backend tests passed: actual claim handler ON/OFF, competing claims, customer ownership, before/at 24h, manual approval start, stable edits, concurrent credit attempts, historical recovery, zero commission, refund rejection, Admin reallocation.
- Tests deterministic in-memory Firestore transaction double பயன்படுத்துகின்றன; production Firestore emulator/live integration test அல்ல.
- Public browser fixture assertions passed: Admin auto/open/claimed controls, manual approval queue, answer history, 0% commission, submitted/customer-view message, credited edit lock. Authenticated live dashboards அல்ல.
- JavaScript syntax checks passed.
- 19 Private Consultation routes மற்றும் private scheduler byte-identical. Private frontend controls unchanged.
- Standalone horoscope engines நான்கும் original source-க்கு byte-identical; SHA-256 report இணைக்கப்பட்டுள்ளது.
- Horoscope actual `/api/horoscope/calculate` மற்றும் `/api/horoscope/full` generation passed. 320/390/768/1440 layouts checked; no JS errors / horizontal overflow. Geocoder external timeout இந்த environment-ல் இருந்தது; manual coordinates வெற்றி. Optional AI provider test செய்யப்படவில்லை.

Production Firebase credentials கொண்டு data மாற்றம், Razorpay live charge, live deployment அல்லது scheduler activation செய்யப்படவில்லை. Deploy பிந்தைய smoke test தேவையாகிறது.

## அதிகாரப்பூர்வ references

- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/transaction-data-contention
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
