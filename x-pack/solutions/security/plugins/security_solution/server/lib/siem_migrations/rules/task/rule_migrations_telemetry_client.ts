/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import {
  SIEM_MIGRATIONS_INTEGRATIONS_MATCH,
  SIEM_MIGRATIONS_MIGRATION_ABORTED,
  SIEM_MIGRATIONS_MIGRATION_FAILURE,
  SIEM_MIGRATIONS_MIGRATION_SUCCESS,
  SIEM_MIGRATIONS_PREBUILT_RULES_MATCH,
  SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE,
  SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS,
  siemMigrationEventNames,
  SiemMigrationsEventTypes,
} from '../../../telemetry/event_based/events/siem_migrations';
import type { RuleMigrationIntegration, RuleSemanticSearchResult } from '../types';
import { SiemMigrationTelemetryClient } from '../../common/task/siem_migrations_telemetry_client';

interface IntegrationMatchEvent {
  preFilterIntegrations: RuleMigrationIntegration[];
  postFilterIntegration?: RuleMigrationIntegration;
}

interface PrebuiltRuleMatchEvent {
  preFilterRules: RuleSemanticSearchResult[];
  postFilterRule?: RuleSemanticSearchResult;
}

export class RuleMigrationTelemetryClient extends SiemMigrationTelemetryClient<RuleMigrationRule> {
  public startSiemMigrationTask() {
    const startTime = Date.now();
    const stats = { completed: 0, failed: 0 };

    return {
      startItemTranslation: () => {
        const ruleStartTime = Date.now();
        return {
          success: (migrationResult: RuleMigrationRule) => {
            stats.completed++;
            this.reportEvent(SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS, {
              migrationId: this.migrationId,
              translationResult: migrationResult.translation_result || '',
              duration: Date.now() - ruleStartTime,
              model: this.modelName,
              prebuiltMatch: migrationResult.elastic_rule?.prebuilt_rule_id ? true : false,
              eventName: siemMigrationEventNames[SiemMigrationsEventTypes.RuleTranslationSuccess],
              vendor: this.vendor,
            });
          },
          failure: (error: Error) => {
            stats.failed++;
            this.reportEvent(SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE, {
              migrationId: this.migrationId,
              error: error.message,
              model: this.modelName,
              eventName: siemMigrationEventNames[SiemMigrationsEventTypes.RuleTranslationFailure],
              vendor: this.vendor,
            });
          },
        };
      },
      success: () => {
        const duration = Date.now() - startTime;
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_SUCCESS, {
          migrationId: this.migrationId,
          type: 'rules',
          model: this.modelName || '',
          completed: stats.completed,
          failed: stats.failed,
          total: stats.completed + stats.failed,
          duration,
          eventName: siemMigrationEventNames[SiemMigrationsEventTypes.MigrationSuccess],
          vendor: this.vendor,
        });
      },
      failure: (error: Error) => {
        const duration = Date.now() - startTime;
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_FAILURE, {
          migrationId: this.migrationId,
          type: 'rules',
          model: this.modelName || '',
          completed: stats.completed,
          failed: stats.failed,
          total: stats.completed + stats.failed,
          duration,
          error: error.message,
          eventName: siemMigrationEventNames[SiemMigrationsEventTypes.MigrationFailure],
          vendor: this.vendor,
        });
      },
      aborted: (error: Error) => {
        const duration = Date.now() - startTime;
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_ABORTED, {
          migrationId: this.migrationId,
          type: 'rules',
          model: this.modelName || '',
          completed: stats.completed,
          failed: stats.failed,
          total: stats.completed + stats.failed,
          duration,
          reason: error.message,
          eventName: siemMigrationEventNames[SiemMigrationsEventTypes.MigrationAborted],
          vendor: this.vendor,
        });
      },
    };
  }

  public reportIntegrationsMatch({
    preFilterIntegrations,
    postFilterIntegration,
  }: IntegrationMatchEvent): void {
    this.reportEvent(SIEM_MIGRATIONS_INTEGRATIONS_MATCH, {
      model: this.modelName,
      migrationId: this.migrationId,
      preFilterIntegrationNames: preFilterIntegrations.map((integration) => integration.id) || [],
      preFilterIntegrationCount: preFilterIntegrations.length,
      postFilterIntegrationName: postFilterIntegration ? postFilterIntegration.id : '',
      postFilterIntegrationCount: postFilterIntegration ? 1 : 0,
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.RuleTranslationIntegrationsMatch],
      vendor: this.vendor,
    });
  }

  public reportPrebuiltRulesMatch({
    preFilterRules,
    postFilterRule,
  }: PrebuiltRuleMatchEvent): void {
    this.reportEvent(SIEM_MIGRATIONS_PREBUILT_RULES_MATCH, {
      model: this.modelName,
      migrationId: this.migrationId,
      preFilterRuleNames: preFilterRules.map((rule) => rule.rule_id) || [],
      preFilterRuleCount: preFilterRules.length,
      postFilterRuleName: postFilterRule ? postFilterRule.rule_id : '',
      postFilterRuleCount: postFilterRule ? 1 : 0,
      eventName:
        siemMigrationEventNames[SiemMigrationsEventTypes.RuleTranslationPrebuiltRulesMatch],
      vendor: this.vendor,
    });
  }
}
