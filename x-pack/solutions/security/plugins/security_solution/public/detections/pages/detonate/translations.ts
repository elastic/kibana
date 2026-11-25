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
export const COLUMN_SUBMITTED = t('columnSubmitted', 'Submitted');
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
export const COLUMN_HASH = t('columnHash', 'Hash');
export const COLUMN_STATUS = t('columnStatus', 'Status');
export const COLUMN_ENVIRONMENT = t('columnEnvironment', 'Environment');
export const STATUS_QUEUED = t('statusQueued', 'Queued');
export const STATUS_COMPLETE = t('statusComplete', 'Complete');
export const STATUS_ERROR = t('statusError', 'Error');
export const STATUS_IN_PROGRESS = t('statusInProgress', 'In progress');
export const COPY_HASH = t('copyHash', 'Copy hash');
export const SEARCH_PLACEHOLDER = t(
  'searchPlaceholder',
  'Search by file, hash, verdict, status or environment'
);
