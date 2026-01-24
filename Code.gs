// ===== FST Workload Web App Backend (writes to 3 tabs template) =====

const PROPERTY_SUBMIT_TOKEN = 'SUBMIT_TOKEN';
const PROPERTY_SPREADSHEET_ID = 'SPREADSHEET_ID';
const PROPERTY_ALLOWED_ORIGIN = 'ALLOWED_ORIGIN';

const SHEET_SUBMISSIONS = 'submissions';
const SHEET_SECTION_SUMMARY = 'section_summary';
const SHEET_RECORDS = 'records';

// Keep headers aligned with your template
const HEADERS_SUBMISSIONS = [
  'serverTimestamp','submissionId','appVersion','generatedAtISO','term',
  'staffName','staffId','category','programme','rank','adminPosition',
  'totalScore','totalHours','status',
  'score_teaching','score_supervision','score_research','score_publications',
  'score_adminLeadership','score_adminDuties','score_service','score_lab','score_professional',
  'count_teaching','count_supervision','count_research','count_publications',
  'count_adminLeadership','count_adminDuties','count_service','count_lab','count_professional',
  'payloadJson'
];

const HEADERS_SECTION_SUMMARY = [
  'serverTimestamp','submissionId','generatedAtISO','term','staffName','staffId',
  'category','programme','rank','adminPosition',
  'sectionKey','sectionScore','sectionCount'
];

const HEADERS_RECORDS = [
  'serverTimestamp','submissionId','generatedAtISO','term','staffName','staffId',
  'sectionKey','recordIndex','recordJson'
];

// ---- Web handlers ----

function doGet(e) {
  // Simple health check + CORS
  return createCorsResponse_({ ok: true, message: 'FST Workload backend is running.' });
}

function doPost(e) {
  try {
    const expected = getSubmitToken_();

    if (!expected) {
      return createCorsResponse_({ ok: false, error: 'Server not configured: SUBMIT_TOKEN missing.' }, true);
    }

    let payload = null;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (error) {
        payload = null;
      }
    }
    if (!payload && e && e.parameter && e.parameter.payload) {
      try {
        payload = JSON.parse(e.parameter.payload);
      } catch (error) {
        payload = null;
      }
    }
    if (!payload) {
      return createCorsResponse_({ ok: false, error: 'Missing request body' }, true, 400);
    }

    const tokenHeader = getHeaderValue_(e, 'X-Submit-Token');
    const tokenBody = payload.submitToken;
    const token = tokenHeader || tokenBody;
    if (!token || token !== expected) {
      return createCorsResponse_({ ok: false, error: 'Unauthorized' }, true, 401);
    }

    const errors = validatePayload_(payload);
    if (errors.length) {
      return createCorsResponse_({ ok: false, error: 'Validation failed', details: errors }, true, 400);
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);

    try {
      const submissionId = payload.clientSubmissionId || generateSubmissionId_();
      const serverTimestamp = new Date().toISOString();

      const ss = SpreadsheetApp.openById(getSpreadsheetId_());

      ensureSheet_(ss, SHEET_SUBMISSIONS, HEADERS_SUBMISSIONS);
      ensureSheet_(ss, SHEET_SECTION_SUMMARY, HEADERS_SECTION_SUMMARY);
      ensureSheet_(ss, SHEET_RECORDS, HEADERS_RECORDS);

      writeSubmissionsRow_(ss, payload, submissionId, serverTimestamp);
      writeSectionSummaryRows_(ss, payload, submissionId, serverTimestamp);
      writeRecordsRows_(ss, payload, submissionId, serverTimestamp);

      return createCorsResponse_({ ok: true, submissionId, serverTimestamp });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return createCorsResponse_({ ok: false, error: err && err.message ? err.message : 'Server error' }, true, 500);
  }
}

// ---- Validation ----

function validatePayload_(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') return ['Payload must be a JSON object.'];

  if (!payload.generatedAtISO) errors.push('generatedAtISO is required.');
  if (!payload.appVersion) errors.push('appVersion is required.');

  const staff = payload.staffProfile || {};
  if (!staff.name) errors.push('staffProfile.name is required.');
  if (!staff.staffId) errors.push('staffProfile.staffId is required.');

  const totals = payload.totals || {};
  if (!isFiniteNumber_(totals.totalScore)) errors.push('totals.totalScore must be a number.');
  if (!isFiniteNumber_(totals.totalHours)) errors.push('totals.totalHours must be a number.');
  if (!totals.status) errors.push('totals.status is required.');

  // Sections keys expected from frontend payload
  const sections = payload.sections || {};
  const requiredSectionKeys = [
    'teaching','supervision','research','publications',
    'adminLeadership','adminDuties','service','lab','professional'
  ];
  requiredSectionKeys.forEach(k => {
    if (!Array.isArray(sections[k])) errors.push(`sections.${k} must be an array.`);
  });

  // totals.bySection keys
  const bySection = (totals.bySection || {});
  const requiredScoreKeys = [
    'teaching','supervision','research','publications',
    'adminLeadership','adminDuties','service','lab','professional'
  ];
  requiredScoreKeys.forEach(k => {
    if (!isFiniteNumber_(bySection[k])) errors.push(`totals.bySection.${k} must be a number.`);
  });

  return errors;
}

// ---- Writes ----

function writeSubmissionsRow_(ss, payload, submissionId, serverTimestamp) {
  const sheet = ss.getSheetByName(SHEET_SUBMISSIONS);

  const staff = payload.staffProfile || {};
  const totals = payload.totals || {};
  const scores = (totals.bySection || {});
  const sections = payload.sections || {};

  const counts = {
    teaching: (sections.teaching || []).length,
    supervision: (sections.supervision || []).length,
    research: (sections.research || []).length,
    publications: (sections.publications || []).length,
    adminLeadership: (sections.adminLeadership || []).length,
    adminDuties: (sections.adminDuties || []).length,
    service: (sections.service || []).length,
    lab: (sections.lab || []).length,
    professional: (sections.professional || []).length
  };

  const row = [
    serverTimestamp,
    submissionId,
    payload.appVersion,
    payload.generatedAtISO,
    payload.term || '',
    staff.name || '',
    staff.staffId || '',
    staff.category || '',
    staff.programme || '',
    staff.rank || '',
    staff.adminPosition || '',
    Number(totals.totalScore || 0),
    Number(totals.totalHours || 0),
    totals.status || '',

    Number(scores.teaching || 0),
    Number(scores.supervision || 0),
    Number(scores.research || 0),
    Number(scores.publications || 0),
    Number(scores.adminLeadership || 0),
    Number(scores.adminDuties || 0),
    Number(scores.service || 0),
    Number(scores.lab || 0),
    Number(scores.professional || 0),

    counts.teaching,
    counts.supervision,
    counts.research,
    counts.publications,
    counts.adminLeadership,
    counts.adminDuties,
    counts.service,
    counts.lab,
    counts.professional,

    JSON.stringify(payload)
  ];

  sheet.appendRow(row);
}

function writeSectionSummaryRows_(ss, payload, submissionId, serverTimestamp) {
  const sheet = ss.getSheetByName(SHEET_SECTION_SUMMARY);

  const staff = payload.staffProfile || {};
  const totals = payload.totals || {};
  const scores = (totals.bySection || {});
  const sections = payload.sections || {};

  const sectionKeys = [
    'teaching','supervision','research','publications',
    'adminLeadership','adminDuties','service','lab','professional'
  ];

  const rows = sectionKeys.map(k => ([
    serverTimestamp,
    submissionId,
    payload.generatedAtISO,
    payload.term || '',
    staff.name || '',
    staff.staffId || '',
    staff.category || '',
    staff.programme || '',
    staff.rank || '',
    staff.adminPosition || '',
    k,
    Number(scores[k] || 0),
    (sections[k] || []).length
  ]));

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function writeRecordsRows_(ss, payload, submissionId, serverTimestamp) {
  const sheet = ss.getSheetByName(SHEET_RECORDS);

  const staff = payload.staffProfile || {};
  const sections = payload.sections || {};

  const sectionKeys = [
    'teaching','supervision','research','publications',
    'adminLeadership','adminDuties','service','lab','professional'
  ];

  const rows = [];
  sectionKeys.forEach(k => {
    const items = sections[k] || [];
    items.forEach((item, idx) => {
      rows.push([
        serverTimestamp,
        submissionId,
        payload.generatedAtISO,
        payload.term || '',
        staff.name || '',
        staff.staffId || '',
        k,
        idx + 1,
        JSON.stringify(item || {})
      ]);
    });
  });

  if (!rows.length) return;
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

// ---- Helpers ----

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  const lastCol = sheet.getLastColumn();
  const hasHeader = sheet.getLastRow() >= 1 && lastCol >= headers.length;

  if (!hasHeader) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function generateSubmissionId_() {
  const timestamp = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHHmmss');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `SUB-${timestamp}-${random}`;
}

function getSubmitToken_() {
  return PropertiesService.getScriptProperties().getProperty(PROPERTY_SUBMIT_TOKEN);
}

function getSpreadsheetId_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROPERTY_SPREADSHEET_ID);
  if (!id) throw new Error('SPREADSHEET_ID is not configured in Script Properties.');
  return id;
}

function getAllowedOrigin_() {
  return PropertiesService.getScriptProperties().getProperty(PROPERTY_ALLOWED_ORIGIN) || '*';
}

function getHeaderValue_(e, headerName) {
  const headers = (e && e.headers) || {};
  const lowerName = headerName.toLowerCase();
  return headers[headerName] || headers[lowerName] || '';
}

function isFiniteNumber_(v) {
  return typeof v === 'number' && isFinite(v);
}

function createCorsResponse_(payload, isError, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);

  const origin = getAllowedOrigin_();

  // Some runtimes support setHeader
  if (output.setHeader) {
    output.setHeader('Access-Control-Allow-Origin', origin);
    output.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Submit-Token');
    output.setHeader('Access-Control-Max-Age', '3600');
    // Status code header isn't officially standard here, but kept for debugging
    if (statusCode) output.setHeader('X-Status-Code', String(statusCode));
  }
  return output;
}
