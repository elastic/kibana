/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QRadarMitreMappingsData } from '../../../../../../common/siem_migrations/model/vendor/rules/qradar.gen';
import type { Threat } from '../../../../../../common/api/detection_engine';
import type { VendorProcessor, VendorProcessorContext, VendorProcessorResult } from '../types';

/**
 * Processor for QRadar MITRE mappings enhancement
 */
export class QRadarMitreProcessor implements VendorProcessor<QRadarMitreMappingsData> {
  constructor(private readonly context: VendorProcessorContext) {}

  /**
   * Processes QRadar MITRE mappings and updates corresponding rules
   */
  async process(data: QRadarMitreMappingsData): Promise<VendorProcessorResult> {
    const { migrationId, dataClient, logger } = this.context;
    const result: VendorProcessorResult = {
      updated: 0,
      errors: [],
    };

    try {
      // Extract rule titles from the mappings data
      const ruleTitles = Object.keys(data);

      if (ruleTitles.length === 0) {
        return result;
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
        return result;
      }

      logger.debug(`Found ${rules.length} rules to enhance`);

      // Process each rule and update with MITRE mappings
      const rulesUpdate = rules.map((rule) => {
        const ruleTitle = rule.original_rule.title;
        const mitreMapping = data[ruleTitle];

        if (!mitreMapping) {
          logger.debug(`No MITRE mapping found for rule: ${ruleTitle}`);
          return undefined;
        }

        const threat = this.transformMitreMapping(mitreMapping);

        // Update the rule with threat information
        return {
          id: rule.id,
          original_rule: {
            ...rule.original_rule,
            threat,
          },
        };
      });
      logger.info(`Updating rules with MITRE mappings: ${JSON.stringify(rulesUpdate, null, 2)}`);

      await dataClient.update(rulesUpdate.filter(Boolean));

      logger.info(
        `Enhanced ${result.updated} rules with MITRE mappings for migration ${migrationId}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error processing QRadar MITRE mappings: ${errorMessage}`);
      throw error;
    }

    return result;
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
      if (!tactic.enabled || !tactic.techniques) {
        continue;
      }

      const techniques: Array<{
        id: string;
        reference: string;
        name: string;
      }> = [];

      // Iterate over techniques for this tactic
      for (const [_techniqueKey, technique] of Object.entries(tactic.techniques)) {
        if (!technique.enabled || !technique.id) {
          continue;
        }

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

    return threats;
  }
}
