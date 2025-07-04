/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger, EventTypeOpts } from '@kbn/core/server';
import {
  SIEM_MIGRATIONS_INTEGRATIONS_MATCH,
  SIEM_MIGRATIONS_MIGRATION_ABORTED,
  SIEM_MIGRATIONS_MIGRATION_FAILURE,
  SIEM_MIGRATIONS_MIGRATION_SUCCESS,
  SIEM_MIGRATIONS_PREBUILT_RULES_MATCH,
  SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE,
  SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS,
} from '../../../telemetry/event_based/events';
import type { RuleMigrationIntegration, RuleSemanticSearchResult } from '../types';
import type { MigrateRuleState } from './agent/types';
import { siemMigrationEventNames } from '../../../telemetry/event_based/event_meta';
import { SiemMigrationsEventTypes } from '../../../telemetry/event_based/types';

interface IntegrationMatchEvent {
  preFilterIntegrations: RuleMigrationIntegration[];
  postFilterIntegration?: RuleMigrationIntegration;
}

interface PrebuiltRuleMatchEvent {
  preFilterRules: RuleSemanticSearchResult[];
  postFilterRule?: RuleSemanticSearchResult;
}

export class SiemMigrationTelemetryClient {
  constructor(
    private readonly telemetry: AnalyticsServiceSetup,
    private readonly logger: Logger,
    private readonly migrationId: string,
    private readonly modelName: string = ''
  ) {}

  private reportEvent<T extends object>(eventTypeOpts: EventTypeOpts<T>, data: T): void {
    try {
      this.telemetry.reportEvent(eventTypeOpts.eventType, data);
    } catch (e) {
      this.logger.error(`Error reporting event ${eventTypeOpts.eventType}: ${e.message}`);
    }
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
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.IntegrationsMatch],
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
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.PrebuiltRulesMatch],
    });
  }

  public startSiemMigrationTask() {
    const startTime = Date.now();
    const stats = { completed: 0, failed: 0 };

    return {
      startRuleTranslation: () => {
        const ruleStartTime = Date.now();
        return {
          success: (migrationResult: MigrateRuleState) => {
            stats.completed++;
            this.reportEvent(SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS, {
              migrationId: this.migrationId,
              translationResult: migrationResult.translation_result || '',
              duration: Date.now() - ruleStartTime,
              model: this.modelName,
              prebuiltMatch: migrationResult.elastic_rule?.prebuilt_rule_id ? true : false,
              eventName: siemMigrationEventNames[SiemMigrationsEventTypes.TranslationSuccess],
            });
          },
          failure: (error: Error) => {
            stats.failed++;
            this.reportEvent(SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE, {
              migrationId: this.migrationId,
              error: error.message,
              model: this.modelName,
              eventName: siemMigrationEventNames[SiemMigrationsEventTypes.TranslationFailure],
            });
          },
        };
      },
      success: () => {
        const duration = Date.now() - startTime;
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_SUCCESS, {
          migrationId: this.migrationId,
          model: this.modelName || '',
          completed: stats.completed,
          failed: stats.failed,
          total: stats.completed + stats.failed,
          duration,
          eventName: siemMigrationEventNames[SiemMigrationsEventTypes.MigrationSuccess],
        });
      },
      failure: (error: Error) => {
        const duration = Date.now() - startTime;
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_FAILURE, {
          migrationId: this.migrationId,
          model: this.modelName || '',
          completed: stats.completed,
          failed: stats.failed,
          total: stats.completed + stats.failed,
          duration,
          error: error.message,
          eventName: siemMigrationEventNames[SiemMigrationsEventTypes.MigrationFailure],
        });
      },
      aborted: (error: Error) => {
        const duration = Date.now() - startTime;
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_ABORTED, {
          migrationId: this.migrationId,
          model: this.modelName || '',
          completed: stats.completed,
          failed: stats.failed,
          total: stats.completed + stats.failed,
          duration,
          reason: error.message,
          eventName: siemMigrationEventNames[SiemMigrationsEventTypes.MigrationAborted],
        });
      },
    };
  }
}
