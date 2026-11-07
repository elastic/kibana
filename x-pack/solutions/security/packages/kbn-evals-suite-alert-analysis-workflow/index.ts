/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  RELATED_ALERT_CASES,
  buildRelatedAlertDoc,
  type RelatedAlertCase,
  type RelatedAlertFixture,
} from './src/related_alert_cases';
export { ALERTS_INDEX, CLASSIFICATIONS, type Classification } from './src/constants';
export { classificationAccuracy } from './src/evaluators';
export { ensureAlertsIndex } from './src/space_config';
