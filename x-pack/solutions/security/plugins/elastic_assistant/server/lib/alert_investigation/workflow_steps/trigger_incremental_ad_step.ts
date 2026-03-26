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

        const authHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'true',
        };
        if (request.headers.authorization) {
          authHeaders.Authorization = request.headers.authorization as string;
        }

        // Fetch anonymization fields (required by AD API)
        const anonResponse = await fetch(
          `${kibanaUrl}/api/security_ai_assistant/anonymization_fields/_find?per_page=1000`,
          { headers: authHeaders }
        );
        const anonData = anonResponse.ok ? await anonResponse.json() : { data: [] };
        const anonymizationFields = (anonData.data ?? []).map((f: Record<string, unknown>) => ({
          id: f.id,
          field: f.field,
          allowed: f.allowed,
          anonymized: f.anonymized,
        }));

        context.logger.info(
          `Fetched ${anonymizationFields.length} anonymization fields for AD generation`
        );

        // Build a filter that limits AD to only the alerts in this case
        const filter = {
          bool: {
            must: [{ ids: { values: alertIds } }],
          },
        };

        const adResponse = await fetch(`${kibanaUrl}/api/attack_discovery/_generate`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            alertsIndexPattern: indexPattern,
            anonymizationFields,
            apiConfig: {
              connectorId,
              actionTypeId: '.gen-ai',
            },
            filter,
            replacements: {},
            size: Math.max(10, alertIds.length),
            subAction: 'invokeAI',
          }),
        });

        if (adResponse.ok) {
          const adResult = await adResponse.json();

          if (adResult.execution_uuid) {
            // AD generation is async — it returns an execution UUID
            context.logger.info(
              `AD generation triggered for case ${caseId}, execution: ${adResult.execution_uuid}`
            );

            return {
              output: {
                case_id: caseId,
                triggered: true,
                alert_count: alertIds.length,
                summary:
                  `## Attack Discovery Triggered\n\n` +
                  `Attack Discovery generation has been initiated for this case with **${alertIds.length} alert(s)**.\n\n` +
                  `View results: [Attack Discovery](/app/security/attack_discovery)\n\n` +
                  `| Detail | Value |\n|--------|-------|\n` +
                  `| Execution | \`${adResult.execution_uuid}\` |\n` +
                  `| Connector | \`${connectorId}\` |\n` +
                  `| Alerts | ${alertIds.length} |\n` +
                  `| Case | \`${caseId}\` |\n\n` +
                  `---\n*Generated by Alert Investigation Pipeline*`,
              },
            };
          }

          // Synchronous response with discoveries
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
          `AD generation API returned ${adResponse.status}: ${await adResponse.text().catch(() => 'unknown')}, falling back to metadata summary`
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

    // Fetch previous AD comments from the case for incremental context
    let previousAdSummaries: string[] = [];
    try {
      const fakeRequest = context.contextManager.getFakeRequest();
      const kibanaUrl = context.contextManager.getContext()?.kibanaUrl ?? 'http://localhost:5601';
      const headers: Record<string, string> = { 'kbn-xsrf': 'true' };
      if (fakeRequest.headers.authorization) {
        headers.Authorization = fakeRequest.headers.authorization as string;
      }

      const commentsResponse = await fetch(
        `${kibanaUrl}/api/cases/${caseId}/comments/_find?perPage=20&sortOrder=desc`,
        { headers }
      );

      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        previousAdSummaries = (commentsData.comments ?? [])
          .filter(
            (c: { type: string; comment?: string }) =>
              c.type === 'user' &&
              c.comment?.includes('Attack Discovery')
          )
          .map((c: { comment: string }) => c.comment);

        if (previousAdSummaries.length > 0) {
          context.logger.info(
            `Found ${previousAdSummaries.length} previous AD summaries for case ${caseId}`
          );
        }
      }
    } catch {
      // Non-critical — proceed without previous context
    }

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

    const isIncremental = previousAdSummaries.length > 0;

    const lines: string[] = [
      isIncremental
        ? `## Incremental Attack Discovery Update`
        : `## Attack Discovery Summary`,
      ``,
      `**${alertIds.length} new alert(s)** analyzed for case \`${caseId}\`.`,
      ``,
    ];

    if (isIncremental) {
      lines.push(
        `> **This is an incremental update.** ${previousAdSummaries.length} previous AD analysis(es) exist for this case. ` +
        `The attack is evolving — compare new findings below with prior analysis.`,
        ``
      );
    }

    lines.push(
      `### New Detection Rules`,
      ...Array.from(ruleNames.entries()).map(
        ([name, count]) => `- **${name}** (${count} alert${count > 1 ? 's' : ''})`
      ),
      ``,
      `### New Entities Observed`,
      ...Array.from(entityByType.entries()).map(
        ([type, values]) =>
          `- **${type}**: ${Array.from(values).slice(0, 5).join(', ')}${values.size > 5 ? ` (+${values.size - 5} more)` : ''}`
      ),
      ``
    );

    if (isIncremental) {
      // Extract rule names from previous summaries for comparison
      const prevRules = new Set<string>();
      for (const prev of previousAdSummaries) {
        const matches = prev.matchAll(/\*\*([^*]+)\*\* \(\d+ alert/g);
        for (const m of matches) {
          prevRules.add(m[1]);
        }
      }

      const newRules = Array.from(ruleNames.keys()).filter((r) => !prevRules.has(r));
      const continuingRules = Array.from(ruleNames.keys()).filter((r) => prevRules.has(r));

      if (newRules.length > 0) {
        lines.push(
          `### ⚠️ New Attack Techniques (not seen in previous analysis)`,
          ...newRules.map((r) => `- **${r}**`),
          ``
        );
      }

      if (continuingRules.length > 0) {
        lines.push(
          `### Continuing Attack Patterns`,
          ...continuingRules.map((r) => `- ${r} (seen in previous analysis)`),
          ``
        );
      }

      lines.push(
        `### Attack Timeline`,
        `- **Previous**: ${previousAdSummaries.length} analysis run(s) completed`,
        `- **Current**: ${alertIds.length} new alert(s) detected`,
        `- **Assessment**: Attack is ${newRules.length > 0 ? '**escalating** — new techniques observed' : 'continuing with known patterns'}`,
        ``
      );
    }

    lines.push(
      `### Recommended Actions`,
      `1. Review the ${ruleNames.size} detection rule${ruleNames.size > 1 ? 's' : ''} that triggered`,
      `2. Investigate the ${entityByType.get('hostname')?.size ?? 0} affected host(s)`,
      `3. Check threat intelligence for extracted IOCs`,
      ...(isIncremental ? [`4. Compare with previous AD analysis in this case timeline`] : []),
      ``,
      `---`,
      `*Generated by Alert Investigation Pipeline${isIncremental ? ' (incremental update)' : ''}*`,
    );

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
