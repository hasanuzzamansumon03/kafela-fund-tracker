/* ════════════════════════════════════════════════
   CONFIG.JS
   তরিকায়ে খাস মোজাদ্দেদিয়া — সিলেট কাফেলা
   ════════════════════════════════════════════════
   ✅ শুধু API_URL ও PIN পরিবর্তন করুন
   ════════════════════════════════════════════════ */

const CONFIG = {

  /* Apps Script Deploy URL এখানে দিন */
  API_URL: 'https://script.google.com/macros/s/AKfycbzUmjI4f0Nqx1KM8oXTva65scrEyLPVaY6i0d_6EHAnk9EXBPV2Dc_2Rs67qK9B_AS-nA/exec',

  /* আপনার ৪ সংখ্যার PIN */
  PIN: '1234',

  /* পরিবর্তন করতে হবে না */
  REFRESH_TIME     : 60000,
  SESSION_KEY      : 'kafela_auth',
  SESSION_EXP      : 'kafela_auth_exp',
  SESSION_DURATION : 8 * 60 * 60 * 1000,

};
