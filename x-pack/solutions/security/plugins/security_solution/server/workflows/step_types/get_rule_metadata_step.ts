/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { getSpaceIdFromRequest } from '../../agent_builder/tools/helpers';

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

export const getRuleMetadataStepDefinition = createServerStepDefinition({
  id: 'security.getRuleMetadata',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { ruleId } = context.input;
      const spaceId = getSpaceIdFromRequest(context.contextManager.getFakeRequest());
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const esClient = context.contextManager.getScopedEsClient();

      const searchResponse = await esClient.search({
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

      const alertSource = searchResponse.hits.hits[0]._source as any;
      const ruleMetadata = {
        rule_id: ruleId,
        rule_name: alertSource?.['kibana.alert.rule.name'],
        rule_uuid: alertSource?.['kibana.alert.rule.uuid'],
        rule_description: alertSource?.['kibana.alert.rule.description'],
        rule_category: alertSource?.['kibana.alert.rule.category'],
        rule_type: alertSource?.['kibana.alert.rule.type'],
        severity: alertSource?.['kibana.alert.severity'],
        references: alertSource?.['kibana.alert.rule.references'],
        threat_framework: alertSource?.['kibana.alert.rule.threat.framework'],
        threat_tactic: alertSource?.['kibana.alert.rule.threat.tactic.name']
          ? {
              id: alertSource?.['kibana.alert.rule.threat.tactic.id'],
              name: alertSource?.['kibana.alert.rule.threat.tactic.name'],
            }
          : undefined,
        threat_technique: alertSource?.['kibana.alert.rule.threat.technique.name']
          ? {
              id: alertSource?.['kibana.alert.rule.threat.technique.id'],
              name: alertSource?.['kibana.alert.rule.threat.technique.name'],
            }
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

