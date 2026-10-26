/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationEnhanceRuleRequestBody } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { QRadarMitreMappingsData } from '../../../../../../common/siem_migrations/model/vendor/rules/qradar.gen';
import type { QradarRule } from '../../../../../../common/siem_migrations/parsers/qradar/types';
import type { CreateRuleMigrationRulesInput } from '../../data/rule_migrations_data_rules_client';
import type { VendorProcessor, VendorProcessorContext } from '../types';
import { transformMitreMapping, transformQRadarRuleToOriginalRule } from './transforms';

type QRadarProcessorType = 'rules' | RuleMigrationEnhanceRuleRequestBody['type'];

type QRadarMitreProcesser = (data: QRadarMitreMappingsData) => Promise<RuleMigrationRule[]>;

type QRadarRulesProcesser = (rules: QradarRule[]) => CreateRuleMigrationRulesInput[];

type QRadarProcessorFn<T extends QRadarProcessorType = 'rules'> = T extends 'mitre'
  ? QRadarMitreProcesser
  : QRadarRulesProcesser;

type QRadarGetProcessor<T extends QRadarProcessorType = 'rules'> = (
  type: T
) => QRadarProcessorFn<T>;

/**
 * Processor for QRadar MITRE mappings enhancement
 */
export class QRadarProcessor implements VendorProcessor<QRadarGetProcessor> {
  constructor(private readonly context: VendorProcessorContext) {}

  getProcessor<T extends QRadarProcessorType>(type: T): QRadarProcessorFn<T> {
    switch (type) {
      case 'mitre':
        return this.processMitreMappings.bind(this) as QRadarProcessorFn<T>;
      case 'rules':
        return this.processRules.bind(this) as QRadarProcessorFn<T>;
      default:
        throw new Error(`Unsupported QRadar processor type: ${type}`);
    }
  }

  processRules(rules: QradarRule[]): CreateRuleMigrationRulesInput[] {
    return rules.map((rule) => ({
      original_rule: transformQRadarRuleToOriginalRule(rule),
      migration_id: this.context.migrationId,
    }));
  }

  /**
   * Processes QRadar MITRE mappings and updates corresponding rules
   */
  async processMitreMappings(data: QRadarMitreMappingsData): Promise<RuleMigrationRule[]> {
    const { migrationId, dataClient, logger } = this.context;
    try {
      // Extract rule titles from the mappings data
      const ruleTitles = Object.keys(data);

      if (ruleTitles.length === 0) {
        return [];
      }

      logger.debug(
        `Processing MITRE mappings for ${ruleTitles.length} QRadar rules in migration ${migrationId}`
      );

      // Fetch rules by titles
      const { data: rules } = await dataClient.get(migrationId, {
        filters: { titles: ruleTitles },
        from: 0,
        size: ruleTitles.length,
      });

      if (rules.length === 0) {
        logger.warn(`No rules found matching provided titles for migration ${migrationId}`);
        return [];
      }

      const rulesToUpdate: RuleMigrationRule[] = [];
      for (const rule of rules) {
        const ruleTitle = rule.original_rule.title;
        const mitreMapping = data[ruleTitle];
        if (mitreMapping) {
          const threat = transformMitreMapping(mitreMapping);
          rulesToUpdate.push({
            ...rule,
            original_rule: {
              ...rule.original_rule,
              threat,
            },
          });
        }
      }

      return rulesToUpdate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error processing QRadar MITRE mappings: ${errorMessage}`);
      throw error;
    }
  }
}
