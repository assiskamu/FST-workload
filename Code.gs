// Google Apps Script Web App backend for FST Workload submissions.

const PROPERTY_SUBMIT_TOKEN = 'SUBMIT_TOKEN';
const PROPERTY_SPREADSHEET_ID = 'SPREADSHEET_ID';
const PROPERTY_ALLOWED_ORIGIN = 'ALLOWED_ORIGIN';

const SUMMARY_HEADERS = [
  'submissionId',
  'serverTimestamp',
  'generatedAtISO',
  'appVersion',
  'term',
  'staffName',
  'staffId',
  'staffCategory',
  'staffProgramme',
  'staffRank',
  'adminPosition',
  'totalScore',
  'totalHours',
  'status'
];

const SECTION_CONFIG = {
  teaching: {
    sheetName: 'teaching_items',
    fields: [
      'course_code',
      'course_name',
      'course_credit_hours',
      'course_class_size',
      'course_lecture',
      'course_tutorial',
      'course_lab',
      'course_fieldwork',
      'course_semester',
      'course_semester_other',
      'course_role',
      'created_at'
    ]
  },
  supervision: {
    sheetName: 'supervision_items',
    fields: [
      'student_name',
      'student_matric',
      'student_level',
      'student_role',
      'student_title',
      'student_year',
      'created_at'
    ]
  },
  research: {
    sheetName: 'research_items',
    fields: [
      'research_title',
      'research_grant_code',
      'research_role',
      'research_amount',
      'research_status',
      'research_year',
      'research_duration',
      'created_at'
    ]
  },
  publications: {
    sheetName: 'publications_items',
    fields: [
      'pub_title',
      'pub_type',
      'pub_index',
      'pub_venue',
      'pub_position',
      'pub_year',
      'pub_status',
      'created_at'
    ]
  },
  adminLeadership: {
    sheetName: 'admin_leadership_items',
    fields: [
      'admin_position',
      'admin_other_position',
      'admin_faculty',
      'admin_allowance',
      'admin_start_date',
      'admin_end_date',
      'created_at'
    ]
  },
  adminDuties: {
    sheetName: 'admin_duties_items',
    fields: [
      'duty_type',
      'duty_name',
      'duty_frequency',
      'duty_year',
      'duty_notes',
      'created_at'
    ]
  },
  service: {
    sheetName: 'service_items',
    fields: [
      'service_type',
      'service_title',
      'service_scope',
      'service_organization',
      'service_date',
      'service_duration',
      'service_description',
      'created_at'
    ]
  },
  lab: {
    sheetName: 'lab_items',
    fields: [
      'lab_responsibility',
      'lab_name',
      'lab_frequency',
      'lab_year',
      'lab_description',
      'created_at'
    ]
  },
  professional: {
    sheetName: 'professional_items',
    fields: [
      'prof_type',
      'prof_scope',
      'prof_title',
      'prof_organization',
      'prof_year',
      'prof_description',
      'created_at'
    ]
  }
};

function doOptions() {
  return createCorsResponse_({ ok: true });
}

function doPost(e) {
  try {
    const token = getHeaderValue_(e, 'X-Submit-Token');
    if (!token || token !== getSubmitToken_()) {
      return createCorsResponse_({ ok: false, error: 'Unauthorized' }, true);
    }

    if (!e || !e.postData || !e.postData.contents) {
      return createCorsResponse_({ ok: false, error: 'Missing request body' }, true);
    }

    const payload = JSON.parse(e.postData.contents);
    const errors = validatePayload_(payload);
    if (errors.length) {
      return createCorsResponse_({ ok: false, error: 'Validation failed', details: errors }, true);
    }

    const submissionId = generateSubmissionId_();
    const serverTimestamp = new Date().toISOString();

    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId_());
    writeSummaryRow_(spreadsheet, payload, submissionId, serverTimestamp);
    writeSectionRows_(spreadsheet, payload, submissionId, serverTimestamp);

    return createCorsResponse_({ ok: true, submissionId, serverTimestamp });
  } catch (error) {
    return createCorsResponse_({ ok: false, error: error.message || 'Server error' }, true);
  }
}

function validatePayload_(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Payload must be a JSON object.'];
  }

  const requiredTop = ['appVersion', 'generatedAtISO', 'staffProfile', 'term', 'sections', 'totals'];
  requiredTop.forEach(field => {
    if (!payload[field]) {
      errors.push(`Missing ${field}.`);
    }
  });

  const staff = payload.staffProfile || {};
  if (!staff.name) errors.push('staffProfile.name is required.');
  if (!staff.staffId) errors.push('staffProfile.staffId is required.');

  const totals = payload.totals || {};
  if (!isFiniteNumber_(totals.totalScore)) errors.push('totals.totalScore must be a number.');
  if (!isFiniteNumber_(totals.totalHours)) errors.push('totals.totalHours must be a number.');
  if (!totals.status) errors.push('totals.status is required.');

  const bySection = totals.bySection || {};
  Object.keys(SECTION_CONFIG).forEach(key => {
    const sectionScore = bySection[key];
    if (!isFiniteNumber_(sectionScore)) {
      errors.push(`totals.bySection.${key} must be a number.`);
    }
  });

  const sections = payload.sections || {};
  Object.keys(SECTION_CONFIG).forEach(key => {
    const items = sections[key];
    if (!Array.isArray(items)) {
      errors.push(`sections.${key} must be an array.`);
    }
  });

  return errors;
}

function writeSummaryRow_(spreadsheet, payload, submissionId, serverTimestamp) {
  const sheet = getOrCreateSheet_(spreadsheet, 'submissions', SUMMARY_HEADERS);
  const staff = payload.staffProfile || {};
  const row = [
    submissionId,
    serverTimestamp,
    payload.generatedAtISO,
    payload.appVersion,
    payload.term,
    staff.name || '',
    staff.staffId || '',
    staff.category || '',
    staff.programme || '',
    staff.rank || '',
    staff.adminPosition || '',
    payload.totals.totalScore,
    payload.totals.totalHours,
    payload.totals.status
  ];
  sheet.appendRow(row);
}

function writeSectionRows_(spreadsheet, payload, submissionId, serverTimestamp) {
  const baseColumns = ['submissionId', 'serverTimestamp', 'generatedAtISO', 'term', 'staffName', 'staffId'];

  Object.keys(SECTION_CONFIG).forEach(key => {
    const config = SECTION_CONFIG[key];
    const items = (payload.sections && payload.sections[key]) || [];
    if (!items.length) return;

    const headers = baseColumns.concat(config.fields);
    const sheet = getOrCreateSheet_(spreadsheet, config.sheetName, headers);

    const rows = items.map(item => {
      const row = [
        submissionId,
        serverTimestamp,
        payload.generatedAtISO,
        payload.term,
        payload.staffProfile?.name || '',
        payload.staffProfile?.staffId || ''
      ];
      config.fields.forEach(field => {
        row.push(item && item[field] !== undefined ? item[field] : '');
      });
      return row;
    });

    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  });
}

function getOrCreateSheet_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
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
  const sheetId = PropertiesService.getScriptProperties().getProperty(PROPERTY_SPREADSHEET_ID);
  if (!sheetId) {
    throw new Error('SPREADSHEET_ID is not configured in Script Properties.');
  }
  return sheetId;
}

function getAllowedOrigin_() {
  return PropertiesService.getScriptProperties().getProperty(PROPERTY_ALLOWED_ORIGIN) || '*';
}

function getHeaderValue_(e, headerName) {
  const headers = (e && e.headers) || {};
  const lowerName = headerName.toLowerCase();
  return headers[headerName] || headers[lowerName] || '';
}

function isFiniteNumber_(value) {
  return typeof value === 'number' && isFinite(value);
}

function createCorsResponse_(payload, isError) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  const origin = getAllowedOrigin_();
  if (output.setHeader) {
    output.setHeader('Access-Control-Allow-Origin', origin);
    output.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Submit-Token');
    output.setHeader('Access-Control-Max-Age', '3600');
  }
  return output;
}
