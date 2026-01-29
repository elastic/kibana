/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import {
  EQL_RULE_TYPE_ID,
  ESQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  SIGNALS_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { RuleCreateProps } from '../../../common/api/detection_engine/model/rule_schema';
import { buildMlAuthz } from '../../lib/machine_learning/authz';
import { createRule } from '../../lib/detection_engine/rule_management/logic/detection_rules_client/methods/create_rule';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { securityTool } from './constants';

const DETECTION_RULE_FILTER = [
  SIGNALS_ID,
  EQL_RULE_TYPE_ID,
  ESQL_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
]
  .map((id) => `alert.attributes.alertTypeId: ${id}`)
  .join(' OR ');

/**
 * Schema for creating a detection rule.
 * Supports query, eql, esql, threshold, threat_match, machine_learning, new_terms, and saved_query rule types.
 */
const createRuleParamsSchema = z.object({
  name: z.string().describe('Name of the detection rule'),
  description: z.string().describe('Description of what the rule detects'),
  risk_score: z.number().int().min(0).max(100).describe('Risk score (0-100)'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Severity level'),
  type: z
    .enum([
      'query',
      'eql',
      'esql',
      'threshold',
      'threat_match',
      'machine_learning',
      'new_terms',
      'saved_query',
    ])
    .describe('Rule type'),
  // Common optional fields
  rule_id: z.string().optional().describe('Optional custom rule ID'),
  enabled: z
    .boolean()
    .optional()
    .describe('Whether to enable the rule immediately (defaults to true)'),
  tags: z.array(z.string()).optional().describe('Tags for categorizing the rule'),
  index: z.array(z.string()).optional().describe('Index patterns to query'),
  // Query-based rule fields
  query: z
    .string()
    .optional()
    .describe('Query string (KQL for query type, EQL for eql type, ES|QL for esql type)'),
  language: z.enum(['kuery', 'lucene', 'eql', 'esql']).optional().describe('Query language'),
  // Saved query fields
  saved_id: z.string().optional().describe('Saved query ID (for saved_query type)'),
  // Threshold rule fields
  threshold: z
    .object({
      field: z.union([z.string(), z.array(z.string())]),
      value: z.number().int().min(1),
      cardinality: z
        .array(
          z.object({
            field: z.string(),
            value: z.number().int().min(1),
          })
        )
        .optional(),
    })
    .optional()
    .describe('Threshold configuration (for threshold type)'),
  // Threat match fields
  threat_query: z.string().optional().describe('Threat indicator query (for threat_match type)'),
  threat_mapping: z
    .array(
      z.object({
        entries: z.array(
          z.object({
            field: z.string(),
            value: z.string(),
            type: z.literal('mapping'),
          })
        ),
      })
    )
    .optional()
    .describe('Threat mapping configuration (for threat_match type)'),
  threat_index: z
    .array(z.string())
    .optional()
    .describe('Threat indicator index patterns (for threat_match type)'),
  threat_indicator_path: z
    .string()
    .optional()
    .describe('Path to threat indicator (for threat_match type)'),
  // ML rule fields
  machine_learning_job_id: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('ML job ID(s) (for machine_learning type)'),
  anomaly_threshold: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe('Anomaly threshold (for machine_learning type)'),
  // New terms fields
  new_terms_fields: z
    .array(z.string())
    .optional()
    .describe('Fields to track for new terms (for new_terms type)'),
  history_window_start: z
    .string()
    .optional()
    .describe('History window start (for new_terms type), e.g., "now-7d"'),
  // Other optional fields
  interval: z.string().optional().describe('How often the rule runs, e.g., "5m"'),
  from: z.string().optional().describe('Time range start, e.g., "now-6m"'),
  to: z.string().optional().describe('Time range end, e.g., "now"'),
  note: z.string().optional().describe('Investigation guide'),
  references: z.array(z.string()).optional().describe('Reference URLs'),
  false_positives: z.array(z.string()).optional().describe('Known false positives'),
  author: z.array(z.string()).optional().describe('Rule authors'),
  license: z.string().optional().describe('License for the rule'),
  confirm: z
    .literal(true)
    .describe('Required for create. Set to true only if the user explicitly confirmed.'),
});

const schema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('find'),
    params: z.object({
      search: z.string().optional().describe('Optional free-text search'),
      perPage: z.number().int().min(1).max(200).optional().default(50),
      page: z.number().int().min(1).optional().default(1),
    }),
  }),
  z.object({
    operation: z.literal('get'),
    params: z.object({
      id: z.string().describe('Alerting rule id'),
    }),
  }),
  z.object({
    operation: z.literal('set_enabled'),
    params: z.object({
      id: z.string().describe('Alerting rule id'),
      enabled: z.boolean().describe('Whether the detection rule should be enabled'),
      confirm: z
        .literal(true)
        .describe(
          'Required for enable/disable. Set to true only if the user explicitly confirmed.'
        ),
    }),
  }),
  z.object({
    operation: z.literal('create'),
    params: createRuleParamsSchema,
  }),
]);

export const detectionRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  setupPlugins: { ml?: MlPluginSetup }
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: securityTool('detection_rules'),
    type: ToolType.builtin,
    description: 'Find/get, enable/disable, and create Security detection rules (no delete).',
    schema,
    confirmation: {
      askUser: 'once',
    },
    handler: async (input, { request }) => {
      const [coreStart, pluginsStart] = await core.getStartServices();

      switch (input.operation) {
        case 'find': {
          const so = coreStart.savedObjects.getScopedClient(request);
          const res = await so.find({
            type: 'alert',
            search: input.params.search,
            perPage: input.params.perPage,
            page: input.params.page,
            filter: DETECTION_RULE_FILTER,
          });
          return {
            results: [
              {
                type: 'other',
                data: {
                  operation: 'find',
                  items: res.saved_objects,
                  total: res.total,
                  perPage: res.per_page,
                  page: res.page,
                },
              },
            ],
          };
        }
        case 'get': {
          const rulesClient = await pluginsStart.alerting.getRulesClientWithRequest(request);
          const res = await rulesClient.get({ id: input.params.id });
          return { results: [{ type: 'other', data: { operation: 'get', item: res } }] };
        }
        case 'set_enabled': {
          const rulesClient = await pluginsStart.alerting.getRulesClientWithRequest(request);
          if (input.params.enabled) {
            await rulesClient.enableRule({ id: input.params.id });
          } else {
            await rulesClient.disableRule({ id: input.params.id });
          }
          const res = await rulesClient.get({ id: input.params.id });
          return { results: [{ type: 'other', data: { operation: 'set_enabled', item: res } }] };
        }
        case 'create': {
          const rulesClient = await pluginsStart.alerting.getRulesClientWithRequest(request);
          const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);
          const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
          const license = pluginsStart.licensing.license;

          // Build ML authorization
          const mlAuthz = buildMlAuthz({
            license,
            ml: setupPlugins.ml,
            request,
            savedObjectsClient,
          });

          // Extract confirm from params (not part of RuleCreateProps)
          const { confirm: _confirm, ...ruleParams } = input.params;

          // Create the rule
          const createdRule = await createRule({
            actionsClient,
            rulesClient,
            mlAuthz,
            rule: {
              ...ruleParams,
              immutable: false,
            } as RuleCreateProps & { immutable: boolean },
          });

          return {
            results: [
              {
                type: 'other',
                data: {
                  operation: 'create',
                  item: createdRule,
                  message: `Detection rule "${createdRule.name}" created successfully with id: ${createdRule.id}`,
                },
              },
            ],
          };
        }
      }
    },
    tags: [],
  };
};
