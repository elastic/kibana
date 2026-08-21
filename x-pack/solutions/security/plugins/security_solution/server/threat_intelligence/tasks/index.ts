/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  PROMOTE_THREAT_INDICATORS_TASK_TYPE,
  PROMOTE_THREAT_INDICATORS_TASK_ID,
  registerPromoteThreatIndicatorsTask,
  schedulePromoteThreatIndicatorsTask,
} from './promote_threat_indicators';

export {
  BACKFILL_DIAMOND_FIELDS_TASK_TYPE,
  BACKFILL_DIAMOND_FIELDS_TASK_ID_PREFIX,
  DIAMOND_SUITABLE_FRACTION_ESTIMATE,
  registerBackfillDiamondFieldsTask,
  scheduleBackfillDiamondFieldsTask,
} from './backfill_diamond_fields';
