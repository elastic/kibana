/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
type ClusterPrivilege = 'manage_index_templates' | 'manage_transform' | 'manage_ingest_pipelines';
// These are the required privileges to install the risk engine - enabling and running require less privileges
// However, we check the full set for simplicity, since the UI does not distinguish between installing and enabling
export const TO_RUN_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES = [
  'manage_transform',
] as ClusterPrivilege[];

export const TO_ENABLE_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES = [
  'manage_index_templates',
  'manage_transform',
  'manage_ingest_pipelines',
] satisfies ClusterPrivilege[];

export const RISK_SCORE_INDEX_PATTERN = 'risk-score.risk-score-*';

export type RiskEngineIndexPrivilege = 'read' | 'write';

export const RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES = Object.freeze({
  [RISK_SCORE_INDEX_PATTERN]: ['read', 'write'] as RiskEngineIndexPrivilege[],
});
