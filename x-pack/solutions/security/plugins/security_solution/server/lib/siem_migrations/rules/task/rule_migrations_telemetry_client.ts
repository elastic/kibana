/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger, EventTypeOpts } from '@kbn/core/server';
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
    });
  }
  public startRuleTranslation(): (
    args: Pick<RuleTranslationEvent, 'error' | 'migrationResult'>
  ) => void {
    const startTime = Date.now();

    return ({ error, migrationResult }) => {
      const duration = Date.now() - startTime;

      if (error) {
        this.reportEvent(SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE, {
          migrationId: this.migrationId,
          error: error.message,
          model: this.modelName,
        });
        return;
      }

      this.reportEvent(SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS, {
        migrationId: this.migrationId,
        translationResult: migrationResult?.translation_result || '',
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
      const total = stats ? stats.completed + stats.failed : 0;

      if (error) {
        this.reportEvent(SIEM_MIGRATIONS_MIGRATION_FAILURE, {
          migrationId: this.migrationId,
          model: this.modelName || '',
          completed: stats ? stats.completed : 0,
          failed: stats ? stats.failed : 0,
          total,
          duration,
          error: error.message,
        });
        return;
      }

      this.reportEvent(SIEM_MIGRATIONS_MIGRATION_SUCCESS, {
        migrationId: this.migrationId,
        model: this.modelName || '',
        completed: stats ? stats.completed : 0,
        failed: stats ? stats.failed : 0,
        total,
        duration,
      });
    };
  }
}
