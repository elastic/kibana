/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  registerPromoteThreatIndicatorsTask,
  schedulePromoteThreatIndicatorsTask,
  PROMOTE_THREAT_INDICATORS_TASK_TYPE,
  PROMOTE_THREAT_INDICATORS_TASK_ID,
} from './promote_threat_indicators';
export {
  registerScrubReportContentTask,
  scheduleScrubReportContentTask,
  SCRUB_REPORT_CONTENT_TASK_TYPE,
  SCRUB_REPORT_CONTENT_TASK_ID,
  CONTENT_RETENTION_DAYS,
} from './scrub_report_content';
