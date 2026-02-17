/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import type { DetectionAlert800 } from '../../../../common/api/detection_engine/model/alerts';

const inputSchema = z.object({
  ruleId: z.string().describe('The rule ID to get metadata for'),
});

const outputSchema = z.object({
  rule_id: z.string(),
  metadata: z.object({
    rule_id: z.string(),
    rule_name: z.string().optional(),
    rule_uuid: z.string().optional(),
    rule_description: z.string().optional(),
    rule_category: z.string().optional(),
    rule_type: z.string().optional(),
    severity: z.string().optional(),
    references: z.array(z.string()).optional(),
    threat_framework: z.string().optional(),
    threat_tactic: z
      .object({
        id: z.string().optional(),
        name: z.string(),
      })
      .optional(),
    threat_technique: z
      .object({
        id: z.string().optional(),
        name: z.string(),
      })
      .optional(),
  }),
  message: z.string(),
  note: z.string().optional(),
});

export const getRuleMetadataInputSchema = inputSchema;

export const getRuleMetadataStepDefinition = createServerStepDefinition({
  id: 'security.getRuleMetadata',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { ruleId } = context.input;
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const esClient = context.contextManager.getScopedEsClient();

      const searchResponse = await esClient.search<DetectionAlert800>({
        index: alertsIndex,
        size: 1,
        _source: [
          'kibana.alert.rule.name',
          'kibana.alert.rule.rule_id',
          'kibana.alert.rule.uuid',
          'kibana.alert.rule.description',
          'kibana.alert.rule.category',
          'kibana.alert.rule.type',
          'kibana.alert.severity',
          'kibana.alert.rule.references',
          'kibana.alert.rule.threat.framework',
          'kibana.alert.rule.threat.tactic.id',
          'kibana.alert.rule.threat.tactic.name',
          'kibana.alert.rule.threat.technique.id',
          'kibana.alert.rule.threat.technique.name',
        ],
        query: {
          term: {
            'kibana.alert.rule.uuid': ruleId,
          },
        },
        sort: [{ '@timestamp': 'desc' }],
      });

      if (searchResponse.hits.hits.length === 0) {
        return {
          error: new Error(`No alerts found for rule ID ${ruleId}`),
        };
      }

      const alertSource = searchResponse.hits.hits[0]._source as
        | Record<string, unknown>
        | undefined;
      const src = (key: string) => alertSource?.[key];

      // Threat is returned as an array; take first item for tactic/technique
      const threatArr = src('kibana.alert.rule.threat');
      const firstThreat =
        Array.isArray(threatArr) && threatArr.length > 0
          ? (threatArr[0] as Record<string, unknown>)
          : undefined;
      const tacticObj = firstThreat?.tactic as { id?: string; name?: string } | undefined;
      const techniqueArr = firstThreat?.technique as
        | Array<{ id?: string; name?: string }>
        | undefined;
      const firstTechnique = Array.isArray(techniqueArr) ? techniqueArr[0] : undefined;

      const ruleMetadata = {
        rule_id: ruleId,
        rule_name: src('kibana.alert.rule.name') as string | undefined,
        rule_uuid: src('kibana.alert.rule.uuid') as string | undefined,
        rule_description: src('kibana.alert.rule.description') as string | undefined,
        rule_category: src('kibana.alert.rule.category') as string | undefined,
        rule_type: src('kibana.alert.rule.type') as string | undefined,
        severity: src('kibana.alert.severity') as string | undefined,
        references: src('kibana.alert.rule.references') as string[] | undefined,
        threat_framework:
          (firstThreat?.framework as string | undefined) ??
          (src('kibana.alert.rule.threat.framework') as string | undefined),
        threat_tactic:
          tacticObj && typeof tacticObj.name === 'string'
            ? { id: tacticObj.id, name: tacticObj.name }
            : undefined,
        threat_technique:
          firstTechnique && typeof firstTechnique.name === 'string'
            ? { id: firstTechnique.id, name: firstTechnique.name }
            : undefined,
      };

      return {
        output: {
          rule_id: ruleId,
          metadata: ruleMetadata,
          message: `Retrieved metadata for rule ${ruleMetadata.rule_name || ruleId}.`,
          note: 'Note: Exceptions are not included in alert data. To check for exceptions, query the rule directly from saved objects.',
        },
      };
    } catch (error) {
      context.logger.error('Failed to get rule metadata', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get rule metadata'),
      };
    }
  },
});
