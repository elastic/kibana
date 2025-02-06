/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  SIEM_MIGRATIONS_INTEGRATIONS_MATCH,
  SIEM_MIGRATIONS_MIGRATION_FAILURE,
  SIEM_MIGRATIONS_MIGRATION_SUCCESS,
  SIEM_MIGRATIONS_PREBUILT_RULES_MATCH,
  SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE,
  SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS,
} from '../../../telemetry/event_based/events';
import type { RuleMigrationIntegration, RuleSemanticSearchResult } from '../types';
import type { MigrateRuleState } from './agent/types';

interface IntegrationMatchEvent {
  preFilterIntegrations: RuleMigrationIntegration[];
  postFilterIntegration?: RuleMigrationIntegration;
}

interface PrebuiltRuleMatchEvent {
  preFilterRules: RuleSemanticSearchResult[];
  postFilterRule?: RuleSemanticSearchResult;
}

interface RuleTranslationEvent {
  error?: Error;
  migrationResult?: MigrateRuleState;
}

interface SiemMigrationEvent {
  error?: Error;
  stats: {
    failed: number;
    completed: number;
  };
}

export class SiemMigrationTelemetryClient {
  constructor(
    private readonly telemetry: AnalyticsServiceSetup,
    private readonly migrationId: string,
    private readonly modelName: string | undefined
  ) {
    this.modelName = modelName || '';
  }

  public reportIntegrationsMatch({
    preFilterIntegrations,
    postFilterIntegration,
  }: IntegrationMatchEvent): void {
    this.telemetry.reportEvent(SIEM_MIGRATIONS_INTEGRATIONS_MATCH.eventType, {
      model: this.modelName,
      migrationId: this.migrationId,
      preFilterIntegrationNames: preFilterIntegrations.map((integration) => integration.id) || [],
      preFilterIntegrationCount: preFilterIntegrations.length,
      postFilterIntegrationName: postFilterIntegration ? postFilterIntegration.id : '',
      postFilterIntegrationCount: postFilterIntegration ? 1 : 0,
    });
  }
  public reportPrebuiltRulesMatch({
    preFilterRules,
    postFilterRule,
  }: PrebuiltRuleMatchEvent): void {
    this.telemetry.reportEvent(SIEM_MIGRATIONS_PREBUILT_RULES_MATCH.eventType, {
      model: this.modelName,
      migrationId: this.migrationId,
      preFilterRuleNames: preFilterRules.map((rule) => rule.rule_id) || [],
      preFilterRuleCount: preFilterRules.length,
      postFilterRuleNames: postFilterRule ? postFilterRule.rule_id : '',
      postFilterRuleCount: postFilterRule ? 1 : 0,
    });
  }
  public startRuleTranslation(): (
    args: Pick<RuleTranslationEvent, 'error' | 'migrationResult'>
  ) => void {
    const startTime = Date.now();

    return ({ error, migrationResult }) => {
      const duration = Date.now() - startTime;

      if (error) {
        this.telemetry.reportEvent(SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE.eventType, {
          migrationId: this.migrationId,
          error: error.message,
          model: this.modelName,
        });
        return;
      }

      this.telemetry.reportEvent(SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS.eventType, {
        migrationId: this.migrationId,
        translationResult: migrationResult?.translation_result,
        duration,
        model: this.modelName,
        prebuiltMatch: migrationResult?.elastic_rule?.prebuilt_rule_id ? true : false,
      });
    };
  }
  public startSiemMigration(): (args: Pick<SiemMigrationEvent, 'error' | 'stats'>) => void {
    const startTime = Date.now();

    return ({ error, stats }) => {
      const duration = Date.now() - startTime;
      const total = stats?.completed + stats?.failed;

      if (error) {
        this.telemetry.reportEvent(SIEM_MIGRATIONS_MIGRATION_FAILURE.eventType, {
          migrationId: this.migrationId,
          model: this.modelName || '',
          completed: stats?.completed,
          failed: stats?.failed,
          total,
          duration,
          error: error.message,
        });
        return;
      }

      this.telemetry.reportEvent(SIEM_MIGRATIONS_MIGRATION_SUCCESS.eventType, {
        migrationId: this.migrationId,
        model: this.modelName || '',
        completed: stats?.completed,
        failed: stats?.failed,
        total,
        duration,
      });
    };
  }
}
