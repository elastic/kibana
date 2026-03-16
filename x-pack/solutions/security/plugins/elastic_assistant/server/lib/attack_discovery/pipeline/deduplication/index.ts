/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { deduplicateAlerts } from './deduplicate_alerts';
export type { DeduplicationResult, AlertWithId } from './deduplicate_alerts';
export { extractAlertFeatures, composeFeatureText, hashFeatureText } from './feature_extraction';
export type { AlertFeatures } from './feature_extraction';
