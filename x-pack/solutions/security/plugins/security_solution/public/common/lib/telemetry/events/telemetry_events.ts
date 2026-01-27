/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { trialCompanionTelemetryEvents } from './trial_companion';
import { alertsTelemetryEvents } from './alerts_grouping';
import { appTelemetryEvents } from './app';
import { dataQualityTelemetryEvents } from './data_quality';
import { documentTelemetryEvents } from './document_details';
import { entityTelemetryEvents } from './entity_analytics';
import { eventLogTelemetryEvents } from './event_log';
import { bulkFillRuleGapsTelemetryEvents } from './bulk_fill_rule_gaps';
import { manualRuleRunTelemetryEvents } from './manual_rule_run';
import { notesTelemetryEvents } from './notes';
import { onboardingHubTelemetryEvents } from './onboarding';
import { previewRuleTelemetryEvents } from './preview_rule';
import { siemMigrationsTelemetryEvents } from './siem_migrations';
import { ruleUpgradeTelemetryEvents } from './rule_upgrade';
import { aiValueReportTelemetryEvents } from './ai_value_report';

export const telemetryEvents = [
  ...alertsTelemetryEvents,
  ...previewRuleTelemetryEvents,
  ...entityTelemetryEvents,
  ...dataQualityTelemetryEvents,
  ...documentTelemetryEvents,
  ...onboardingHubTelemetryEvents,
  ...manualRuleRunTelemetryEvents,
  ...ruleUpgradeTelemetryEvents,
  ...bulkFillRuleGapsTelemetryEvents,
  ...eventLogTelemetryEvents,
  ...notesTelemetryEvents,
  ...appTelemetryEvents,
  ...siemMigrationsTelemetryEvents,
  ...aiValueReportTelemetryEvents,
  ...trialCompanionTelemetryEvents,
];
