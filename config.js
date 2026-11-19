/*
 * Wheel of Power settings: the only file to edit on the day.
 * Change one line, save, reload the page. No code changes needed.
 */
window.WHEEL_CONFIG = {
  eventName: {                 // one per language; a single "..." string also works
    en: "Leadership Workshop",  // ASSUMPTION: Ken to set the workshop name
    fr: "Atelier sur le leadership"
  },
  session: "WS1",              // workshop code stored with every row; /admin can switch it for a test run
  languages: ["en", "fr"],     // participant page languages; ["en"] hides the language menu
  endpoint: "https://script.google.com/macros/s/AKfycbzL-1_Uij_0oz4yRb9tRxY4fSUcp9Pn6GUFFWV96wPjitee6AhuMqApgGgWhgcfcNgS/exec",                // Apps Script web app URL (not secret). Empty = answers stay on the phone only
  minGroup: 5,                 // group averages (Deep analytics, /live sections) appear from this many submissions
  livePollSeconds: 5,          // /live refresh
  newsletterSignup: true,      // "Join the newsletter" form on Intro and Result (needs the Apps Script + MailerLite key); false hides it
  allowRetake: false,          // true = "Change my answers" on the result screen (a resubmission replaces the row)
  sheetUrl: "https://docs.google.com/spreadsheets/d/1OFCvSsqg_4bFruJvVgn3ik270Q1F64AIMZPK7nmHFDs/edit?gid=1421011819#gid=1421011819",                // /admin shortcut to the Google Sheet (the Sheet itself stays private)
  publicUrl: "wheelpower.wcrp-academy.org" // shown on /live so latecomers can join
  // The organiser PIN is checked by the Apps Script (Script property ADMIN_PIN_HASH), never here.
};
