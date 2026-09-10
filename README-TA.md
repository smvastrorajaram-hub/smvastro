# SMV ASTRO — ஒரே தமிழ் / English இணையதளம்

இரண்டு ZIP கோப்புகளிலிருந்தும் ஒருங்கிணைக்கப்பட்ட எளிய HTML, CSS, JavaScript பதிப்பு. React / Vite / frontend npm install தேவையில்லை.

## பயன்படுத்துவது

1. ZIP-ஐ extract செய்யுங்கள்.
2. `index.html`, `assets/`, `css/`, `js/`, `manifest.webmanifest`, `sw.js`, `privacy.html`, `terms.html` ஆகியவற்றை GitHub Pages frontend இடத்தில் பதிவேற்றுங்கள். `index.html` மட்டும் பதிவேற்றினால் செயல்படாது.
3. ஆரம்ப மொழி தமிழ். Header-ல் English தேர்ந்தெடுத்தால் முகப்பும் ஜாதகமும் English-ல் தோன்றும். தேர்வு அதே உலாவியில் நினைவில் வைக்கப்படும்.
4. ஒரே ஜாதகப் பகுதியில் தேர்ந்தெடுத்த மொழிக்கான படிவம் மட்டும் தெரியும். பெயர், பிறந்த தேதி/நேரம், இடம், அட்சரேகை/தீர்க்கரேகை மொழிமாற்றத்தில் தக்கவைக்கப்படும்.
5. ஜாதகம் உருவாக்கிய பின் மொழியை மாற்றினால், அந்த மொழியில் ஜாதகம் மீண்டும் உருவாக்கப்படும். கணிப்பு நடைபெறும்போது மொழித் தேர்வு தற்காலிகமாக முடக்கப்படும்.

உள்ளூர் சோதனை: project folder-ல் `python -m http.server 8000` இயக்கி `http://localhost:8000` திறக்கவும். Firebase, Razorpay, geocoding மற்றும் ஜாதக API-க்கு இணைய இணைப்பு தேவை.

## எதை எங்கு திருத்துவது?

| மாற்றம் | கோப்பு |
| --- | --- |
| Header / buttons | `sections/01-header.html` |
| Hero / முகப்பு | `sections/02-home.html` |
| Ask Now | `sections/03-askNowSection.html` |
| ஜாதகப் படிவங்கள் | `sections/06-horoscope.html` |
| FAQ | `sections/07-faq.html` |
| Customer dashboard | `sections/09-dashboard.html` |
| Question form | `sections/12-ask-flow.html` |
| Contact | `sections/13-contact.html` |
| Admin controls | `sections/14-admin.html` |
| நிறம் / அளவு / mobile layout | `css/basic.css` |
| ஜாதகக் கட்டங்கள் / பழைய செயல்பாட்டு CSS | `css/preserved.css` |
| மொழித் தேர்வு / புதிய தமிழ் வாசகங்கள் | `js/language.js` |
| பொதுவான மொழிபெயர்ப்பு அகராதி | `js/translations.js` |
| தமிழ் ZIP-இன் கூடுதல் ஜாதக மொழிபெயர்ப்புகள் | `js/horoscope-ta-dictionary.js` |
| Firebase auth / dashboards / frontend payment | `js/auth-dashboard-payments.mjs` |
| ஜாதகக் கணிப்பு / தமிழ் rendering | `js/horoscope-engine.js` |
| English ஜாதக rendering | `js/english-horoscope.js` |
| Backend URL | `js/config.js` |
| Render backend | `backend/server.js` |

**HTML section கோப்புகளை மாற்றிய பிறகு `python tools/build.py` இயக்க வேண்டும்.** அது பகுதிகளைச் சேர்த்து `index.html`-ஐ மீண்டும் உருவாக்கும். ஏற்கனவே உருவாக்கப்பட்ட index.html இந்த ZIP-ல் உள்ளது. பயன்படுத்துவதற்கு build செய்யத் தேவையில்லை. CSS / JS மாற்றங்களுக்கு இந்த build தேவையில்லை.

## Firebase மற்றும் Razorpay

- Firebase project configuration பழைய `smv-astro` project-ஐ பயன்படுத்துகிறது.
- Render URL பழைய `https://smv-astro-1fco.onrender.com` ஆகவே உள்ளது; மாற்ற வேண்டுமெனில் `js/config.js` மட்டும் திருத்துங்கள்.
- Authentication, question creation, Razorpay order creation, payment verification மற்றும் webhook வழிகள் தக்கவைக்கப்பட்டுள்ளன.
- ஜாதகக் கணக்கீட்டு engine கோப்புகளும் Firestore rules/indexes-மும் மூலக் கோப்புகளுடன் மாற்றமின்றி உள்ளன.
- தமிழ் backend-இன் கூடுதல் claim/translation endpoints ஒருங்கிணைக்கப்பட்டுள்ளன. வாடிக்கையாளர் / ஜோதிடர் எழுதிய பதில் கட்டாயமாக தமிழில் மாற்றப்பட்டுச் சேமிக்கப்படாது; மூல மொழியிலேயே சேமிக்கப்படும். பக்க மொழிமாற்றம் மட்டும் சேமிக்கப்பட்ட பதிவுகளை மாற்றாது.
- Backend-ஐ deploy செய்ய வேண்டுமெனில், இதே repository-யில் Render Root Directory = `backend`, Build Command = `npm install`, Start Command = `npm start` என அமைக்கவும். ஏற்கனவே தனி backend repository இருந்தால், `backend/` உள்ள கோப்புகளை அதன் root-க்கு பதிவேற்றவும்; அப்போது Root Directory மாற்றத் தேவையில்லை.
- Render-ல் ஏற்கனவே உள்ள environment variables மற்றும் webhook configuration-ஐத் தக்கவைக்கவும். Secret keys-ஐ frontend-ல் சேர்க்க வேண்டாம். `backend/.env.example` என்பது உதாரணம் மட்டுமே.
- புதிய frontend domain பயன்படுத்தினால் உங்கள் Firebase authorized domains மற்றும் backend CORS அமைப்பில் அந்த domain இருக்க வேண்டும்.

## சோதனை நிலை

JavaScript syntax, local asset paths, duplicate HTML IDs, மொழி மாற்றம், பிறப்பு விவரங்கள் தக்கவைத்தல், dynamic UI மொழிபெயர்ப்பு, horoscope dictionary, service initialization மற்றும் Home/ஜாதக navigation ஆகியவை உள்ளூர் DOM சோதனையில் சரிபார்க்கப்பட்டன. Firebase mock மூலம் initialization/navigation மட்டுமே சோதிக்கப்பட்டது; அது உண்மையான Firebase integration சோதனை அல்ல.

இந்தச் சூழலில் browser preview இணைப்பு தடுக்கப்பட்டதால் mobile/desktop காட்சியை screenshot மூலம் உறுதி செய்ய இயலவில்லை. Live Firebase login, உண்மையான ஜாதக API response, Razorpay checkout/verification/webhook மற்றும் admin workflow ஆகியவற்றை deploy செய்த தளத்தில் சோதிக்க வேண்டும். உண்மையான payment எதுவும் செய்யப்படவில்லை.

பதிவேற்றிய பின்: தமிழ் → English → தமிழ்; இரு மொழியிலும் ஜாதகம்; Login → Ask Now → Back → Home → Ask Now; Razorpay test-mode payment → dashboard; Admin/astrologer question-answer ஆகியவற்றைச் சோதிக்கவும்.


## V2 — Header / Login / Ask Now திருத்தம்

- Header இணைப்புகள் பெட்டியில்லாமல், எளிய எழுத்து பட்டன்களாக மாற்றப்பட்டுள்ளன.
- மொபைலில் Login முறைகள் தனித்தனி வரிகளாக வரும். நீண்ட தமிழ் வாசகங்கள் ஒன்றோடொன்று மோதாது இருக்க புதிய responsive விதிகள் சேர்க்கப்பட்டுள்ளன.
- Ask Now பட்டனின் absolute-position எழுத்து அமைப்பு நீக்கப்பட்டுள்ளது; முழு தமிழ் வாசகத்திற்கேற்ப பட்டன் விரியும்.
- Header logo சிறிய embedded image ஆக உள்ளது; header logo-க்கு தனி image path சார்பு இல்லை.
- Login label/input இணைப்புகள், தேர்ந்தெடுக்கப்பட்ட login முறைக்கான accessible state சேர்க்கப்பட்டுள்ளன.
- Ask Now → Login → Close → Home மூன்று முறை, மூன்று login முறைகள், password visibility, மொழிமாற்றம் ஆகியவை mocked DOM சோதனையில் வெற்றி. Live Firebase sign-in / Razorpay சோதனை செய்யப்படவில்லை.

முழு ZIP-ஐ extract செய்து முந்தைய frontend கோப்புகளை மாற்றவும். அதே பெயரிலான பழைய கோப்புகளை வைத்திருக்க வேண்டாம். உங்கள் browser-ல் பக்கத்தை refresh செய்யுங்கள். இந்த V2-க்காக backend-ஐ மீண்டும் மாற்றத் தேவையில்லை; backend கோப்புகள் முந்தைய merged பதிப்புடன் ஒரே மாதிரி உள்ளன.
