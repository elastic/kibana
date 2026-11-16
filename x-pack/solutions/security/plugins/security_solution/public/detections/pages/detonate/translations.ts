/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const t = (key: string, defaultMessage: string) =>
  i18n.translate(`xpack.securitySolution.detonatePage.${key}`, { defaultMessage });

export const PAGE_TITLE = t('title', 'Detonate');
export const TABLE_CAPTION = t('tableCaption', 'Recent detonations');
export const COLUMN_FILE = t('columnFile', 'File');
export const COLUMN_VERDICT = t('columnVerdict', 'Verdict');
export const COLUMN_SCORE = t('columnScore', 'Threat score');
export const COLUMN_HOST = t('columnHost', 'Host');
export const COLUMN_SUBMITTED = t('columnSubmitted', 'Submitted');
export const COLUMN_REPORT_ID = t('columnReportId', 'Report ID');
export const SUBMIT_FILE_URL = t('submitFileUrl', 'Submit file/URL');
export const COLUMN_DETONATION = t('columnDetonation', 'Detonation');
export const COLUMN_ACTIONS = t('columnActions', 'Actions');
export const ORIGIN_AUTO = t('originAuto', 'Auto-detonated');
export const ORIGIN_MANUAL = t('originManual', 'Submitted manually');
export const ACTION_VIEW_REPORT = t('actionViewReport', 'View report');
export const ACTION_VIEW_CASE = t('actionViewCase', 'View case');
export const ACTION_REDETONATE = t('actionRedetonate', 'Redetonate');
export const ACTION_VIEW_REPORT_DESCRIPTION = t(
  'actionViewReportDescription',
  'Open the behavior report'
);
export const ACTION_VIEW_CASE_DESCRIPTION = t(
  'actionViewCaseDescription',
  'Open the case this report is attached to'
);
export const ACTION_REDETONATE_DESCRIPTION = t(
  'actionRedetonateDescription',
  'Run this file again in the sandbox'
);
export const DETONATING = t('detonating', 'Detonating…');
export const NO_VERDICT_YET = t('noVerdictYet', 'No verdict yet');
