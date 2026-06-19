# Digital Trust App — COMDA (PWA Demo)

אפליקציית **PWA** להדגמת חתימה דיגיטלית מול שירותי COMDA.
ללא שרת וללא בסיס נתונים — כל המידע נשמר ב-`localStorage` של הדפדפן.
בנויה ב-Vanilla JS ללא שלב Build, ומתאימה לפרסום ב-GitHub Pages כפי שהיא.

---

## פרסום ב-GitHub Pages

1. צרו ריפו חדש ב-GitHub והעלו אליו את כל תוכן התיקייה (כולל `index.html` בשורש).
   ```bash
   git init
   git add .
   git commit -m "Digital Trust App"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
2. ב-GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, בחרו ענף `main` ותיקייה `/ (root)`.
3. האפליקציה תהיה זמינה בכתובת `https://<user>.github.io/<repo>/`.

> כל הנתיבים יחסיים, כך שהאפליקציה עובדת גם תחת תת-נתיב של GitHub Pages.
> ב-`https` ה-Service Worker וה-Passkey/WebAuthn פעילים. בפיתוח מקומי השתמשו ב-`http://localhost` (גם הוא נחשב מאובטח).

### הרצה מקומית
```bash
python3 -m http.server 8080
# פתחו http://localhost:8080
```

---

## כפתור הגדרות מנהל (מוסתר)

קיים כפתור **שקוף** בפינה התחתונה של המסך (פינה תחתית, בצד). לחיצה עליו פותחת את **מסך הגדרות המנהל**, שבו ניתן:

- להגדיר את כתובת **שירות אימות הזהות** (Redirect). כתובת ריקה או לא זמינה → מוצג כפתור "המשך ללא תהליך הזדהות".
- להגדיר עבור כל מתודת חתימה (**PDF / Word / Excel**) את ה-**URL** ואת **גוף הבקשה (JSON)**.
  הקובץ מוזרק אוטומטית במקום `{{FILE_BASE64}}`, הקוד האישי במקום `{{PINCODE}}`, ושם הקובץ במקום `{{FILENAME}}`.
- לייבא **אנשי קשר מקובץ Excel** (עמודות אפשריות: `name` / `email` / `phone`, כולל שמות בעברית).
- **לייצא / לייבא** את כל ההגדרות והאנשי קשר כקובץ JSON.
- **לנקות את כל נתוני האפליקציה** לצורך הדגמה נקייה מחדש.

---

## מתודות החתימה (Signer1 API)

מתוך מסמך ה-API שצורף — שלוש מתודות, אחת לכל סוג קובץ:

| סוג | מתודה | שדות עיקריים ב-Body |
|-----|--------|---------------------|
| PDF | `SignPDF_PIN` | `CertID`, `Pincode`, `InputFile` (base64), `Page`, `Left/Top/Width/Height` |
| Word | `SignWord_PIN` | `CertID`, `InputFile`, `Pincode`, `Name` |
| Excel | `SignExcel_PIN` | `CertID`, `InputFile`, `Pincode`, `Name` |

תבניות ה-Body מולאו מראש בהגדרות. את שאר הערכים (למשל `CertID`) משלימים ידנית.
התשובה נקראת כ-`SignResponse`: `Result` (0 = הצלחה) ו-`SignedBytes` (base64).

---

## מה מלא ומה מפושט לצורך הדמו

- **OTP** — מוצג בבאנר הדגמה במסך כדי שניתן יהיה לאמת את הזרימה ללא שרת מייל (תוקף 5 דקות, ספירה לאחור, שליחה חוזרת).
- **כניסה עם Google** — בורר חשבון הדגמה (ללא OAuth אמיתי, שמצריך שרת).
- **אימות זהות** — מדמה Redirect הלוך-ושוב והחזרת טוקן. אם הכתובת ריקה/לא זמינה — מוצג כפתור "המשך ללא תהליך הזדהות".
- **חתימה** — קריאת `fetch` אמיתית ל-URL שהוגדר במסך המנהל. ללא URL מוגדר ניתן "Demo sign" כדי להדגים את חוויית ההצלחה/הורדה.
- **PINCODE** — מדיניות מלאה: 6 ספרות, ללא ספרה בודדת חוזרת, ללא רצף עולה/יורד.
- **Passkey** — WebAuthn אמיתי (ביומטרי) כשהדפדפן/המכשיר תומך, עם נפילה ל-PINCODE.
- **עורך השדות** — רינדור PDF אמיתי (pdf.js), הוספת שדות בלחיצה, גרירה בלחיצה ארוכה, שינוי גודל מהפינה (כולל קטן מאוד), גלילה ו-pinch-zoom, וגודל פונט אוטומטי. קובצי Word מרונדרים כ-best-effort (mammoth.js).
- **אנשי קשר במכשיר** — דרך Contact Picker API היכן שנתמך (Chrome/Android), אחרת מוצגת הודעה.

---

## מבנה הפרויקט
```
index.html
manifest.webmanifest
service-worker.js
css/styles.css
assets/logo.png
icons/icon-192.png · icon-512.png · maskable-512.png
js/ i18n.js · store.js · utils.js · app.js · auth.js · home.js · sign.js · admin.js · recipient.js
```

## גרסה
מספר הגרסה מוצג במסך **About** ובכותרת התחתונה. גרסה נוכחית: מוגדרת ב-`js/store.js` (`APP_VERSION`).
בכל עדכון יש להעלות את המספר כדי לזהות באפליקציה שהגרסה התחדשה.
