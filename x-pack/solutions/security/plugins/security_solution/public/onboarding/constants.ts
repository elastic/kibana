/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const PAGE_CONTENT_WIDTH = '1150px';

export enum OnboardingTopicId {
  default = 'default',
  siemMigrations = 'siem_migrations',
}

export enum OnboardingCardId {
  integrations = 'integrations',
  integrationsSearchAILake = 'integrations_search_ai_lake',
  knowledgeSource = 'knowledge_source',
  searchAiLakeLLM = 'search_ai_lake_llm',
  dashboards = 'dashboards',
  rules = 'rules',
  alerts = 'alerts',
  assistant = 'assistant',
  assistantExternalDetections = 'assistant_external_detections',
  attackDiscovery = 'attack_discovery',

  // siem_migrations topic cards
  siemMigrationsAiConnectors = 'ai_connectors',
  siemMigrationsRules = 'migrate_rules',
  siemMigrationIntegrations = 'migration_integrations',
  siemMigrationDashboards = 'migrate_dashboards',
}
