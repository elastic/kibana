/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnhanceRuleMigrationsRequestBody } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { QRadarMitreMappingsData } from '../../../../../../common/siem_migrations/model/vendor/rules/qradar.gen';
import type { Threat } from '../../../../../../common/api/detection_engine';
import type { VendorProcessor, VendorProcessorContext } from '../types';

type QRadarProcessors = 'rules' | EnhanceRuleMigrationsRequestBody['enhancement_type'];

type QRadarMitreProcesser = (data: QRadarMitreMappingsData) => Promise<RuleMigrationRule[]>;

type QRadarRulesProcesser = (data: QRadarRulesProcesser) => Promise<RuleMigrationRule[]>;

type GetMitreProcessor = (type: 'mitre') => QRadarMitreProcesser;
type GetRulesProcessor = (type: 'rules') => QRadarRulesProcesser;

type QRadarGetProcessor = GetMitreProcessor | GetRulesProcessor;

/**
 * Processor for QRadar MITRE mappings enhancement
 */
export class QRadarProcessor implements VendorProcessor<QRadarGetProcessor> {
  constructor(private readonly context: VendorProcessorContext) {}

  getProcessor(type: QRadarProcessors) {
    switch (type) {
      case 'mitre':
        return this.processMitreMappings.bind(this);
      case 'rules':
        throw new Error('QRadar rules processor not implemented yet');
      default:
        throw new Error(`Unsupported QRadar processor type: ${type}`);
    }
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
          const threat = this.transformMitreMapping(mitreMapping);
          rulesToUpdate.push({
            ...rule,
            original_rule: {
              ...rule.original_rule,
              threat,
            },
          });
        }
      }

      logger.info(`Prepared Rules : ${JSON.stringify(rulesToUpdate, null, 2)}`);

      return rulesToUpdate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error processing QRadar MITRE mappings: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Transforms QRadar MITRE mapping to Elastic Threat format
   */
  private transformMitreMapping(mitreMapping: QRadarMitreMappingsData[string]): Threat[] {
    const threats: Threat[] = [];

    if (!mitreMapping.mapping) {
      return threats;
    }

    // Iterate over tactics in the mapping
    for (const [tacticId, tactic] of Object.entries(mitreMapping.mapping)) {
      if (tactic.enabled && tactic.techniques) {
        const techniques: Array<{
          id: string;
          reference: string;
          name: string;
        }> = [];

        // Iterate over techniques for this tactic
        for (const [_techniqueKey, technique] of Object.entries(tactic.techniques)) {
          if (technique.enabled && technique.id) {
            techniques.push({
              id: technique.id,
              reference: `https://attack.mitre.org/techniques/${technique.id}/`,
              name: technique.id, // QRadar doesn't provide technique names
            });
          }

          if (techniques.length > 0) {
            threats.push({
              framework: 'MITRE ATT&CK',
              tactic: {
                id: tacticId,
                reference: `https://attack.mitre.org/tactics/${tacticId}/`,
                name: tactic.name,
              },
              technique: techniques,
            });
          }
        }
      }
    }

    return threats;
  }
}
