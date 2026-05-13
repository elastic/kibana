/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// All shared constants now live in @kbn/siem-readiness-common.
// Re-exported here for backward compatibility.
export {
  GET_SIEM_READINESS_CATEGORIES_API_PATH,
  GET_SIEM_READINESS_RETENTION_API_PATH,
  GET_SIEM_READINESS_PIPELINES_API_PATH,
  GET_SIEM_READINESS_QUALITY_API_PATH,
  GET_SIEM_READINESS_COVERAGE_API_PATH,
  GET_INDEX_RESULTS_LATEST_API_PATH,
  CATEGORY_ORDER,
  ALL_CATEGORIES,
  SIEM_READINESS_CATEGORIES,
  MAIN_CATEGORY_MAPPING,
  ECS_CATEGORY_TO_MAIN,
  RETENTION_THRESHOLD_DAYS,
  SILENCE_THRESHOLD_HOURS,
  DROP_THRESHOLD_RATIO,
} from '@kbn/siem-readiness-common';
