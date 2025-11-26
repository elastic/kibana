/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Type exports
export type {
  AlertsRagExample,
  AttackDiscoveryExample,
  BaseDatasetExample,
  CustomKnowledgeExample,
  Dataset,
  DatasetJson,
  DefendInsightsExample,
  DefendInsightExample,
  DefendInsightEventExample,
  DefendInsightRemediationExample,
  EsqlExample,
} from './types';

// Loader exports
export {
  loadDataset,
  loadDatasetExamples,
  isAlertsRagExample,
  isAttackDiscoveryExample,
  isCustomKnowledgeExample,
  isDefendInsightsExample,
  isEsqlExample,
} from './loader';

// Import JSON datasets
import alertsRagRegressionJson from './alerts_rag_regression.json';
import attackDiscoveryScenariosJson from './attack_discovery_scenarios.json';
import customKnowledgeJson from './custom_knowledge.json';
import esqlGenerationJson from './esql_generation.json';

import {
  loadDataset,
  isAlertsRagExample,
  isAttackDiscoveryExample,
  isCustomKnowledgeExample,
  isEsqlExample,
} from './loader';
import type {
  AlertsRagExample,
  AttackDiscoveryExample,
  CustomKnowledgeExample,
  DatasetJson,
  EsqlExample,
} from './types';

/**
 * Alerts RAG regression dataset
 * Tests Security AI Assistant responses about alerts
 */
export const alertsRagRegressionDataset: DatasetJson<AlertsRagExample> =
  loadDataset<AlertsRagExample>(alertsRagRegressionJson, isAlertsRagExample);

/**
 * Attack Discovery scenarios dataset
 * Tests Attack Discovery graph outputs
 */
export const attackDiscoveryScenariosDataset: DatasetJson<AttackDiscoveryExample> =
  loadDataset<AttackDiscoveryExample>(attackDiscoveryScenariosJson, isAttackDiscoveryExample);

/**
 * Custom Knowledge dataset
 * Tests Knowledge Base integration with AI Assistant
 */
export const customKnowledgeDataset: DatasetJson<CustomKnowledgeExample> =
  loadDataset<CustomKnowledgeExample>(customKnowledgeJson, isCustomKnowledgeExample);

/**
 * ES|QL Generation dataset
 * Tests ES|QL query generation
 */
export const esqlGenerationDataset: DatasetJson<EsqlExample> = loadDataset<EsqlExample>(
  esqlGenerationJson,
  isEsqlExample
);
