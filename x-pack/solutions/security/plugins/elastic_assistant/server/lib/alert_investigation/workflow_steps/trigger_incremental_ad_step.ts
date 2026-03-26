/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { extractEntitiesFromAlerts } from '../entity_extraction';
import { fetchAlertsByIds, adaptWorkflowLogger } from '../utils';
import { parseArrayInput } from './workflow_schema_helpers';

export const TriggerIncrementalAdStepId = 'security.triggerIncrementalAd';

const TriggerAdInputSchema = z.object({
  case_id: z.string(),
  alert_ids: z.union([z.array(z.string()), z.string()]),
  index_pattern: z.string().default('.alerts-security.alerts-default'),
  connector_id: z.string().optional(),
  min_new_alerts: z.number().default(2),
});

const TriggerAdOutputSchema = z.object({
  case_id: z.string(),
  triggered: z.boolean(),
  alert_count: z.number(),
  summary: z.string(),
  reason: z.string().optional(),
});

export const triggerIncrementalAdStep = createServerStepDefinition({
  id: TriggerIncrementalAdStepId,
  category: StepCategory.Kibana,
  label: 'Trigger Incremental Attack Discovery',
  description:
    'Generates an Attack Discovery for a case. When a connector_id is provided, calls the AD generation API. ' +
    'Otherwise generates a metadata-based summary from alert entities.',
  documentation: {
    details:
      'Receives case_id + alert_ids. With connector_id: calls POST /api/attack_discovery/_generate. ' +
      'Without connector_id: fetches alerts, extracts entities, builds structured summary.',
    examples: [],
  },
  inputSchema: TriggerAdInputSchema,
  outputSchema: TriggerAdOutputSchema,
  handler: async (context) => {
    const { min_new_alerts, index_pattern: indexPattern, connector_id: connectorId } =
      context.input;
    const caseId = String(context.input.case_id);
    const alertIds = parseArrayInput(context.input.alert_ids);

    if (alertIds.length < min_new_alerts) {
      return {
        output: {
          case_id: caseId,
          triggered: false,
          alert_count: alertIds.length,
          summary: `*Not enough data to generate Attack Discovery — only ${alertIds.length} alert(s), minimum ${min_new_alerts} required.*`,
          reason: `Only ${alertIds.length} alerts, need at least ${min_new_alerts}`,
        },
      };
    }

    // If connector_id provided, call the real AD generation API
    if (connectorId) {
      try {
        const request = context.contextManager.getFakeRequest();
        const kibanaUrl =
          context.contextManager.getContext()?.kibanaUrl ?? 'http://localhost:5601';

        context.logger.info(
          `Calling AD generation API for case ${caseId} with connector ${connectorId} and ${alertIds.length} alerts`
        );

        // Build a filter that limits AD to only the alerts in this case
        const filter = {
          bool: {
            must: [{ ids: { values: alertIds } }],
          },
        };

        const adResponse = await fetch(`${kibanaUrl}/api/attack_discovery/_generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true',
            'elastic-api-version': '2023-10-31',
            Authorization: request.headers.authorization as string,
          },
          body: JSON.stringify({
            alertsIndexPattern: indexPattern,
            anonymizationFields: [],
            apiConfig: {
              connectorId,
              actionTypeId: '.bedrock',
            },
            filter,
            size: alertIds.length,
            subAction: 'invokeAI',
          }),
        });

        if (adResponse.ok) {
          const adResult = await adResponse.json();
          context.logger.info(
            `AD generation succeeded for case ${caseId}: ${adResult.attackDiscoveries?.length ?? 0} discoveries`
          );

          const discoveries = adResult.attackDiscoveries ?? [];
          const summary = discoveries.length > 0
            ? discoveries.map((d: { title: string; summaryMarkdown: string }) =>
                `### ${d.title}\n${d.summaryMarkdown}`
              ).join('\n\n')
            : '*No attack discoveries generated from the provided alerts.*';

          return {
            output: {
              case_id: caseId,
              triggered: true,
              alert_count: alertIds.length,
              summary: `## Attack Discovery\n\n${summary}`,
            },
          };
        }

        context.logger.warn(
          `AD generation API returned ${adResponse.status}, falling back to metadata summary`
        );
      } catch (err) {
        context.logger.warn(
          `AD generation API call failed: ${err instanceof Error ? err.message : err}. Falling back to metadata summary`
        );
      }
    }

    // Fallback: generate summary from alert metadata
    const esClient = context.contextManager.getScopedEsClient();
    const logger = adaptWorkflowLogger(context.logger);
    const alerts = await fetchAlertsByIds({ esClient, indexPattern, alertIds, logger });
    const extraction = extractEntitiesFromAlerts({ alerts, logger });

    const ruleNames = new Map<string, number>();
    for (const alert of alerts) {
      const ruleName =
        (alert._source['kibana.alert.rule.name'] as string) ?? 'Unknown Rule';
      ruleNames.set(ruleName, (ruleNames.get(ruleName) ?? 0) + 1);
    }

    const entityByType = new Map<string, Set<string>>();
    for (const entity of extraction.entities) {
      if (!entityByType.has(entity.typeKey)) {
        entityByType.set(entity.typeKey, new Set());
      }
      entityByType.get(entity.typeKey)!.add(entity.value);
    }

    const lines: string[] = [
      `## Attack Discovery Summary`,
      ``,
      `**${alertIds.length} alerts** analyzed for case \`${caseId}\`.`,
      ``,
      `### Detection Rules`,
      ...Array.from(ruleNames.entries()).map(
        ([name, count]) => `- **${name}** (${count} alert${count > 1 ? 's' : ''})`
      ),
      ``,
      `### Key Entities`,
      ...Array.from(entityByType.entries()).map(
        ([type, values]) =>
          `- **${type}**: ${Array.from(values).slice(0, 5).join(', ')}${values.size > 5 ? ` (+${values.size - 5} more)` : ''}`
      ),
      ``,
      `### Recommended Actions`,
      `1. Review the ${ruleNames.size} detection rule${ruleNames.size > 1 ? 's' : ''} that triggered`,
      `2. Investigate the ${entityByType.get('hostname')?.size ?? 0} affected host(s)`,
      `3. Check threat intelligence for extracted IOCs`,
      ``,
      `---`,
      `*Generated by Alert Investigation Pipeline (metadata-based, no LLM connector configured)*`,
    ];

    const summary = lines.join('\n');

    context.logger.info(
      `Generated metadata-based AD for case ${caseId}: ${alertIds.length} alerts, ${ruleNames.size} rules`
    );

    return {
      output: {
        case_id: caseId,
        triggered: true,
        alert_count: alertIds.length,
        summary,
      },
    };
  },
});
