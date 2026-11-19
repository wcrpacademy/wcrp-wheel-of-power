// Interface text for the participant page (index.html), English and French.
// Same pattern as the values card sort: data-i18n="key" fills an element's text, data-i18n-label="key" its
// aria-label, {name} is a placeholder. Answers are always stored with language-neutral keys and numbers.
//
// French is an unofficial translation: a French speaker must check it before the workshop.
// ASSUMPTION: the consent text is a draft until the ethics review gives the approved wording.

export const LANG_NAMES = { en: 'English', fr: 'Français' };
const LANG_KEY = 'wcrp-wheel-lang';

const STRINGS = {
  en: {
    pageTitle: 'Wheel of Power · WCRP Academy',
    loading: 'Loading…',
    langGroup: 'Language',
    skip: 'Skip to content',

    'intro.kicker': 'Reflection activity',
    'intro.title': 'Wheel of Power and Privilege',
    'intro.lead': 'Where do you sit on each part of the wheel? Closer to the centre means closer to power.',
    'intro.meta': '12 sections · about 5 minutes · anonymous',
    'intro.how': 'How it works',
    'intro.step1': 'You see the 12 sections of the wheel one at a time.',
    'intro.step2': 'For each one, tap the ring that fits you best. You can also pick a point between two rings.',
    'intro.step3': 'If a section doesn’t apply to you, choose “Not applicable to me”.',
    'intro.step4': 'At the end you see your own wheel. Only you see it, on this phone.',
    'consent.title': 'Before you start',
    'consent.p1': 'Your answers are saved anonymously. We don’t ask for your name, email or any contact details.',
    'consent.p2': 'Group results will be reported outside this workshop, only as totals and averages. No one’s individual answers are shown on the screen or reported.',
    'consent.p3': 'Some sections are personal, such as sexuality, mental health and citizenship. Answer only what you are comfortable with: any section can be marked “Not applicable to me”, and you can stop at any time.',
    'consent.p4': 'When you finish, you get a short code. Give it to the organiser if you want your answers removed later.',
    'consent.check': 'I have read this and agree to take part.',
    'consent.error': 'Tick the box to agree before you start.',
    'intro.start': 'Start',
    'intro.resume': 'Continue',
    'intro.startOver': 'Start over',
    'intro.startOverQ': 'Start over? This clears your answers on this phone.',
    'intro.startOverYes': 'Yes, start over',
    'intro.cancel': 'Cancel',
    'intro.noStore': 'This browser can’t save your progress. Keep this page open until you finish.',
    credit: 'Wheel adapted from the Wheel of Power/Privilege by Sylvia Duckworth (adapted from ccrweb.ca), redrawn for this workshop.',

    hub: 'POWER',
    naShort: 'N/A',
    'q.progress': '{i} of {total}',
    'q.progressLabel': 'Section {i} of {total}',
    'q.prompt': 'Where are you on this part of the wheel? Tap the wheel or pick an answer.',
    'q.hint': 'Closer to the centre = closer to power.',
    'opt.betweenShort': 'In between',
    'q.options': 'Your answer for {section}',
    'ring.1': 'Outer ring',
    'ring.2': 'Middle ring',
    'ring.3': 'Centre ring',
    'ring.between': 'Between rings',
    'opt.between': 'Between “{a}” and “{b}”',
    'opt.aria': '{section}: {ring}, {label}',
    'opt.na': 'Not applicable to me',
    'opt.naAria': '{section}: not applicable to me',
    'q.back': 'Back',
    'q.next': 'Next',
    'q.review': 'Check answers',
    'q.toReview': 'Back to the list',
    'q.need': 'Choose a ring, a point between two rings, or “Not applicable to me”.',

    'review.title': 'Check your answers',
    'review.lead': 'Change anything before you send.',
    'review.change': 'Change',
    'review.changeAria': 'Change {section}',
    'review.na': 'Not applicable',
    'review.missing': 'Not answered yet',
    'review.submit': 'Send my answers',
    'review.final': 'You can’t change your answers after sending.',
    'review.needAll': 'Answer every section, or mark it not applicable, to send.',

    'result.title': 'Your wheel',
    'result.lead': 'Your answers, drawn on the wheel. Only you see this.',
    'result.closeness': 'Closeness to power',
    'band.high': '90% and above',
    'band.mid': '70–90%',
    'band.low': '70% and below',
    'result.band': 'Band: {band}',
    'result.answered': '{n} of {total} sections answered',
    'result.tooFew': 'Answer at least 9 sections to see an overall score.',
    'legend.centre': 'Closer to centre = closer to power',
    'legend.you': 'Your answer',
    'legend.na': 'Not applicable',
    'result.naList': 'Not applicable: {list}',
    'result.reflect': 'This is a reflection tool, not a measurement of you. The score sums up where you placed yourself in the sections that apply to you.',
    'result.deep': 'Deep analytics',
    'result.deepHint': 'Your answer in each section, beside the group average.',
    'result.code': 'Your withdrawal code',
    'result.codeHelp': 'If you want your answers removed later, give this code to the organiser.',
    'result.retake': 'Change my answers',
    'result.done': 'Thank you for taking part.',
    'save.local': 'Your answers are kept on this phone only.',
    'save.saving': 'Sending…',
    'save.saved': 'Answers sent',
    'save.pending': 'Not sent yet, we’ll keep trying',
    'save.retry': 'Try again',

    'deep.back': 'Back to your wheel',
    'deep.title': 'Deep analytics',
    'deep.lead': 'Your ring in each section, beside the average of everyone who answered that section.',
    'deep.you': 'You',
    'deep.group': 'Group average',
    'deep.outer': 'Outer',
    'deep.middle': 'Middle',
    'deep.centre': 'Centre',
    'deep.na': 'Not applicable',
    'deep.waiting': 'Group averages appear once {min} people have taken part.',
    'deep.loading': 'Loading group averages…',
    'deep.error': 'Couldn’t load the group averages.',
    'deep.offline': 'Group averages aren’t available on this device.',
    'deep.retry': 'Try again',
    'deep.few': 'Too few answers for a group average',
    'deep.n': 'n = {n} of {total}',
    'deep.groupOf': 'Group: {n} people so far.',
    'deep.srYou': 'You: {value}.',
    'deep.srGroup': 'Group average: {value}, {n} of {total} people answered.',
    'val.1': 'outer ring',
    'val.1.5': 'between outer and middle ring',
    'val.2': 'middle ring',
    'val.2.5': 'between middle and centre ring',
    'val.3': 'centre ring',
    'val.mean': 'ring {ring} ({pct})',

    'error.title': 'Something went wrong',
    'error.load': 'We couldn’t load the activity. Reload the page, or ask a facilitator.',
    'error.reload': 'Reload the page',

    // Header, newsletter and WCRP Academy links (same wording as the values card sort)
    officialSite: 'Official site',
    officialSiteNote: ' (wcrp-academy.org, opens in a new tab)',
    newTab: ' (opens in a new tab)',
    langButton: 'Language: {name}',
    'news.title': 'Stay in touch with the WCRP Academy',
    'news.lead': 'Climate science training and opportunities, in our quarterly newsletter.',
    'news.open': 'Join the newsletter',
    'news.thanks': 'You’re signed up. Thank you!',
    'links.flp': 'Future Leaders Programme',
    'links.flpText': 'The WCRP Academy’s programme for the next generation of climate science leaders.',
    'links.flpMore': 'Find out more',
    'links.catalogue': 'Training catalogue',
    'links.catalogueText': 'Browse climate science courses and training from across the WCRP Academy network.',
    'links.catalogueMore': 'Browse training',
    'footer.tagline': 'A hub for climate science training',
    'footer.social': 'WCRP Academy on social media',
    'footer.on': 'WCRP Academy on {site} (opens in a new tab)',
    'footer.copy': '© {year} WCRP Academy. All rights reserved.',
    'nl.title': 'Join the WCRP Academy newsletter',
    'nl.close': 'Close',
    'nl.intro': 'Climate science training and opportunities, four times a year. This is separate from the wheel: your wheel answers stay anonymous and are never linked to your sign-up.',
    'nl.required': 'Required',
    'nl.first': 'First name',
    'nl.last': 'Last name',
    'nl.email': 'Email address',
    'nl.country': 'Country',
    'nl.countryPick': 'Select your country',
    'nl.language': 'Language',
    'nl.languagePick': 'Select a language',
    'nl.affiliation': 'Affiliation or institution',
    'nl.roles': 'Are you a/an…',
    'nl.topics': 'What topics are you interested in?',
    'nl.consentBefore': 'I agree to receive communications from the WCRP Academy and accept the',
    'nl.consentLink': 'data privacy statement',
    'nl.consentAfter': '.',
    'nl.submit': 'Subscribe',
    'nl.submitting': 'Subscribing…',
    'nl.doneTitle': 'Thank you for signing up!',
    'nl.doneText': 'Look out for the WCRP Academy newsletter in your inbox.',
    'nl.offlineTitle': 'Sign-up needs the internet',
    'nl.offlineText': 'This page isn’t connected to the internet service, so we can’t sign you up here. You can sign up any time at wcrp-academy.org.',
    'nl.errFirst': 'Enter your first name.',
    'nl.errLast': 'Enter your last name.',
    'nl.errEmail': 'Enter your email address.',
    'nl.errEmailBad': 'Enter an email address like name@example.org.',
    'nl.errConsent': 'Tick the box to agree, so we can send you the newsletter.',
    'nl.errOffline': 'You seem to be offline. Check your connection and try again.',
    'nl.errRefused': 'This email address wasn’t accepted. Please check it.',
    'nl.errLater': 'We couldn’t sign you up just now. Please try again, or sign up later at wcrp-academy.org.',
  },

  fr: {
    pageTitle: 'Roue du pouvoir · WCRP Academy',
    loading: 'Chargement…',
    langGroup: 'Langue',
    skip: 'Aller au contenu',

    'intro.kicker': 'Activité de réflexion',
    'intro.title': 'Roue du pouvoir et des privilèges',
    'intro.lead': 'Où vous situez-vous dans chaque partie de la roue ? Plus près du centre signifie plus près du pouvoir.',
    'intro.meta': '12 sections · environ 5 minutes · anonyme',
    'intro.how': 'Comment ça marche',
    'intro.step1': 'Vous voyez les 12 sections de la roue, une à la fois.',
    'intro.step2': 'Pour chacune, touchez l’anneau qui vous correspond le mieux. Vous pouvez aussi choisir un point entre deux anneaux.',
    'intro.step3': 'Si une section ne vous concerne pas, choisissez « Ne me concerne pas ».',
    'intro.step4': 'À la fin, vous voyez votre propre roue. Vous seul·e la voyez, sur ce téléphone.',
    'consent.title': 'Avant de commencer',
    'consent.p1': 'Vos réponses sont enregistrées de façon anonyme. Nous ne demandons ni votre nom, ni votre e-mail, ni aucune coordonnée.',
    'consent.p2': 'Les résultats du groupe seront présentés en dehors de cet atelier, uniquement sous forme de totaux et de moyennes. Les réponses individuelles ne sont ni affichées à l’écran ni présentées.',
    'consent.p3': 'Certaines sections sont personnelles, comme la sexualité, la santé mentale ou la citoyenneté. Ne répondez qu’à ce qui vous convient : chaque section peut être marquée « Ne me concerne pas », et vous pouvez arrêter à tout moment.',
    'consent.p4': 'À la fin, vous recevez un code court. Donnez-le à l’organisateur si vous voulez que vos réponses soient supprimées plus tard.',
    'consent.check': 'J’ai lu ces informations et j’accepte de participer.',
    'consent.error': 'Cochez la case pour donner votre accord avant de commencer.',
    'intro.start': 'Commencer',
    'intro.resume': 'Continuer',
    'intro.startOver': 'Recommencer',
    'intro.startOverQ': 'Recommencer ? Vos réponses sur ce téléphone seront effacées.',
    'intro.startOverYes': 'Oui, recommencer',
    'intro.cancel': 'Annuler',
    'intro.noStore': 'Ce navigateur ne peut pas enregistrer votre progression. Gardez cette page ouverte jusqu’à la fin.',
    credit: 'Roue adaptée de la Wheel of Power/Privilege de Sylvia Duckworth (d’après ccrweb.ca), redessinée pour cet atelier.',

    hub: 'POUVOIR',
    naShort: 'N/C',
    'q.progress': '{i} sur {total}',
    'q.progressLabel': 'Section {i} sur {total}',
    'q.prompt': 'Où vous situez-vous dans cette partie de la roue ? Touchez la roue ou choisissez une réponse.',
    'q.hint': 'Plus près du centre = plus près du pouvoir.',
    'opt.betweenShort': 'Entre les deux',
    'q.options': 'Votre réponse pour {section}',
    'ring.1': 'Anneau extérieur',
    'ring.2': 'Anneau du milieu',
    'ring.3': 'Anneau central',
    'ring.between': 'Entre deux anneaux',
    'opt.between': 'Entre « {a} » et « {b} »',
    'opt.aria': '{section} : {ring}, {label}',
    'opt.na': 'Ne me concerne pas',
    'opt.naAria': '{section} : ne me concerne pas',
    'q.back': 'Retour',
    'q.next': 'Suivant',
    'q.review': 'Vérifier mes réponses',
    'q.toReview': 'Retour à la liste',
    'q.need': 'Choisissez un anneau, un point entre deux anneaux, ou « Ne me concerne pas ».',

    'review.title': 'Vérifiez vos réponses',
    'review.lead': 'Modifiez ce que vous voulez avant d’envoyer.',
    'review.change': 'Modifier',
    'review.changeAria': 'Modifier {section}',
    'review.na': 'Ne me concerne pas',
    'review.missing': 'Pas encore répondu',
    'review.submit': 'Envoyer mes réponses',
    'review.final': 'Vous ne pourrez plus modifier vos réponses après l’envoi.',
    'review.needAll': 'Répondez à chaque section, ou marquez-la « Ne me concerne pas », pour envoyer.',

    'result.title': 'Votre roue',
    'result.lead': 'Vos réponses, dessinées sur la roue. Vous seul·e voyez ceci.',
    'result.closeness': 'Proximité du pouvoir',
    'band.high': '90 % et plus',
    'band.mid': '70–90 %',
    'band.low': '70 % et moins',
    'result.band': 'Tranche : {band}',
    'result.answered': '{n} sections sur {total} renseignées',
    'result.tooFew': 'Répondez à au moins 9 sections pour voir un score global.',
    'legend.centre': 'Plus près du centre = plus près du pouvoir',
    'legend.you': 'Votre réponse',
    'legend.na': 'Ne me concerne pas',
    'result.naList': 'Ne me concerne pas : {list}',
    'result.reflect': 'C’est un outil de réflexion, pas une mesure de votre personne. Le score résume où vous vous êtes placé·e dans les sections qui vous concernent.',
    'result.deep': 'Analyse détaillée',
    'result.deepHint': 'Votre réponse dans chaque section, à côté de la moyenne du groupe.',
    'result.code': 'Votre code de retrait',
    'result.codeHelp': 'Si vous voulez que vos réponses soient supprimées plus tard, donnez ce code à l’organisateur.',
    'result.retake': 'Modifier mes réponses',
    'result.done': 'Merci de votre participation.',
    'save.local': 'Vos réponses restent uniquement sur ce téléphone.',
    'save.saving': 'Envoi…',
    'save.saved': 'Réponses envoyées',
    'save.pending': 'Pas encore envoyé, nous réessayons',
    'save.retry': 'Réessayer',

    'deep.back': 'Retour à votre roue',
    'deep.title': 'Analyse détaillée',
    'deep.lead': 'Votre anneau dans chaque section, à côté de la moyenne de toutes les personnes qui ont répondu à cette section.',
    'deep.you': 'Vous',
    'deep.group': 'Moyenne du groupe',
    'deep.outer': 'Extérieur',
    'deep.middle': 'Milieu',
    'deep.centre': 'Centre',
    'deep.na': 'Ne me concerne pas',
    'deep.waiting': 'Les moyennes du groupe apparaissent dès que {min} personnes ont participé.',
    'deep.loading': 'Chargement des moyennes du groupe…',
    'deep.error': 'Impossible de charger les moyennes du groupe.',
    'deep.offline': 'Les moyennes du groupe ne sont pas disponibles sur cet appareil.',
    'deep.retry': 'Réessayer',
    'deep.few': 'Trop peu de réponses pour une moyenne',
    'deep.n': 'n = {n} sur {total}',
    'deep.groupOf': 'Groupe : {n} personnes pour l’instant.',
    'deep.srYou': 'Vous : {value}.',
    'deep.srGroup': 'Moyenne du groupe : {value}, {n} personnes sur {total} ont répondu.',
    'val.1': 'anneau extérieur',
    'val.1.5': 'entre l’anneau extérieur et celui du milieu',
    'val.2': 'anneau du milieu',
    'val.2.5': 'entre l’anneau du milieu et l’anneau central',
    'val.3': 'anneau central',
    'val.mean': 'anneau {ring} ({pct})',

    'error.title': 'Un problème est survenu',
    'error.load': 'Impossible de charger l’activité. Rechargez la page, ou demandez à un animateur.',
    'error.reload': 'Recharger la page',

    // En-tête, lettre d’information et liens WCRP Academy
    officialSite: 'Site officiel',
    officialSiteNote: ' (wcrp-academy.org, s’ouvre dans un nouvel onglet)',
    newTab: ' (s’ouvre dans un nouvel onglet)',
    langButton: 'Langue : {name}',
    'news.title': 'Restez en contact avec la WCRP Academy',
    'news.lead': 'Formations et opportunités en science du climat, dans notre lettre d’information trimestrielle.',
    'news.open': 'S’abonner à la lettre d’information',
    'news.thanks': 'Inscription confirmée. Merci !',
    'links.flp': 'Future Leaders Programme',
    'links.flpText': 'Le programme de la WCRP Academy pour la prochaine génération de leaders en science du climat.',
    'links.flpMore': 'En savoir plus',
    'links.catalogue': 'Catalogue de formations',
    'links.catalogueText': 'Parcourez les cours et formations en science du climat de tout le réseau de la WCRP Academy.',
    'links.catalogueMore': 'Voir les formations',
    'footer.tagline': 'Un pôle de formation en science du climat',
    'footer.social': 'La WCRP Academy sur les réseaux sociaux',
    'footer.on': 'La WCRP Academy sur {site} (s’ouvre dans un nouvel onglet)',
    'footer.copy': '© {year} WCRP Academy. Tous droits réservés.',
    'nl.title': 'Abonnez-vous à la lettre d’information de la WCRP Academy',
    'nl.close': 'Fermer',
    'nl.intro': 'Formations et opportunités en science du climat, quatre fois par an. C’est indépendant de la roue : vos réponses restent anonymes et ne sont jamais liées à votre inscription.',
    'nl.required': 'Obligatoire',
    'nl.first': 'Prénom',
    'nl.last': 'Nom',
    'nl.email': 'Adresse e-mail',
    'nl.country': 'Pays',
    'nl.countryPick': 'Choisissez votre pays',
    'nl.language': 'Langue',
    'nl.languagePick': 'Choisissez une langue',
    'nl.affiliation': 'Affiliation ou institution',
    'nl.roles': 'Vous êtes…',
    'nl.topics': 'Quels sujets vous intéressent ?',
    'nl.consentBefore': 'J’accepte de recevoir des communications de la WCRP Academy et j’accepte la',
    'nl.consentLink': 'déclaration de confidentialité des données',
    'nl.consentAfter': '.',
    'nl.submit': 'S’abonner',
    'nl.submitting': 'Abonnement en cours…',
    'nl.doneTitle': 'Merci pour votre inscription !',
    'nl.doneText': 'La lettre d’information de la WCRP Academy arrivera dans votre boîte de réception.',
    'nl.offlineTitle': 'L’inscription nécessite Internet',
    'nl.offlineText': 'Cette page n’est pas connectée au service en ligne, nous ne pouvons donc pas vous inscrire ici. Vous pouvez vous inscrire à tout moment sur wcrp-academy.org.',
    'nl.errFirst': 'Saisissez votre prénom.',
    'nl.errLast': 'Saisissez votre nom.',
    'nl.errEmail': 'Saisissez votre adresse e-mail.',
    'nl.errEmailBad': 'Saisissez une adresse e-mail du type nom@exemple.org.',
    'nl.errConsent': 'Cochez la case pour donner votre accord, afin que nous puissions vous envoyer la lettre d’information.',
    'nl.errOffline': 'Vous semblez être hors ligne. Vérifiez votre connexion et réessayez.',
    'nl.errRefused': 'Cette adresse e-mail n’a pas été acceptée. Merci de la vérifier.',
    'nl.errLater': 'Nous n’avons pas pu vous inscrire pour le moment. Réessayez, ou inscrivez-vous plus tard sur wcrp-academy.org.',
  },
};

let lang = 'en';
let available = ['en'];
const listeners = [];

/** The languages offered (config.js `languages`), and which one to start in. */
export function initLang(cfg) {
  const wanted = Array.isArray(cfg.languages) ? cfg.languages : ['en'];
  available = wanted.filter((l) => STRINGS[l]);
  if (!available.length) available = ['en'];
  lang = pickStart();
  document.documentElement.lang = lang;
}

function pickStart() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (available.includes(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  for (const l of navigator.languages || [navigator.language || '']) {
    const base = String(l).slice(0, 2).toLowerCase();
    if (available.includes(base)) return base;
  }
  return available[0];
}

export const getLang = () => lang;
export const getLanguages = () => [...available];

export function setLang(next) {
  if (!available.includes(next) || next === lang) return;
  lang = next;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
  for (const fn of listeners) fn(lang);
}

export const onLangChange = (fn) => listeners.push(fn);

// Newsletter choices: the value sent to MailerLite stays in English (same as the wcrp-academy.org form);
// only the label shown changes.
export const CHOICE_LABELS = {
  fr: {
    English: 'Anglais',
    French: 'Français',
    Spanish: 'Espagnol',
    Portuguese: 'Portugais',
    Arabic: 'Arabe',
    Chinese: 'Chinois',
    Russian: 'Russe',
    Other: 'Autre',
    'NGO member': 'Membre d’une ONG',
    Undergraduate: 'Étudiant(e) en licence',
    Postgraduate: 'Étudiant(e) en master ou doctorat',
    Researcher: 'Chercheur ou chercheuse',
    'Climate Change Impacts Adaptation and Vulnerability': 'Impacts du changement climatique, adaptation et vulnérabilité',
    'Mitigation of Climate Change': 'Atténuation du changement climatique',
    'Physical Science Basis of Climate Change': 'Bases scientifiques physiques du changement climatique',
  },
};

/** A label for a newsletter choice whose value stays in English. */
export const choiceLabel = (value) => (CHOICE_LABELS[lang] && CHOICE_LABELS[lang][value]) || value;

/** Text for a key, with {placeholders} filled. Falls back to English, then to the key. */
export function t(key, vars = {}) {
  const s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/** A percentage with one decimal in the page language: 63.6% / 63,6 %. */
export function fmtPct(x, digits = 1) {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(x / 100);
}

/** A plain number with up to 2 decimals in the page language (ring means: 2.17 / 2,17). */
export function fmtNum(x, digits = 2) {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: digits }).format(x);
}

/** A localised field from sections.json ({en, fr}), falling back to English. */
export const pick = (obj) => (obj ? obj[lang] || obj.en || '' : '');

/** Fill every [data-i18n] / [data-i18n-label] under root. */
export function applyText(vars = {}, root = document) {
  document.title = t('pageTitle');
  for (const node of root.querySelectorAll('[data-i18n]')) {
    const text = t(node.dataset.i18n, { ...vars, ...node.dataset });
    if (node.textContent !== text) node.textContent = text;
  }
  for (const node of root.querySelectorAll('[data-i18n-label]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nLabel, { ...vars, ...node.dataset }));
  }
}
