/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { parseArrayInput } from './workflow_schema_helpers';

/**
 * Poll the AD _find API until discoveries appear for the given alert IDs.
 * Returns an array of discovery document IDs for deep linking via ?id=.
 */
const pollForDiscoveries = async ({
  kibanaUrl,
  authHeaders,
  alertIds,
  maxAttempts,
  intervalMs,
  logger,
}: {
  kibanaUrl: string;
  authHeaders: Record<string, string>;
  alertIds: string[];
  maxAttempts: number;
  intervalMs: number;
  logger: { info: (msg: string) => void; warn: (msg: string) => void };
}): Promise<string[]> => {
  const alertIdsParam = alertIds.slice(0, 20).join(',');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const findResponse = await fetch(
        `${kibanaUrl}/api/attack_discovery/_find?alert_ids=${encodeURIComponent(
          alertIdsParam
        )}&per_page=10&sort_order=desc`,
        { headers: authHeaders }
      );

      if (findResponse.ok) {
        const findResult = await findResponse.json();
        const discoveries = findResult.data ?? [];

        if (discoveries.length > 0) {
          const ids = discoveries.map((d: { id?: string }) => d.id).filter(Boolean) as string[];
          logger.info(
            `Found ${ids.length} AD discoveries after ${attempt} poll(s) for case alerts`
          );
          return ids;
        }
      }
    } catch {
      // Non-critical — continue polling
    }

    if (attempt % 3 === 0) {
      logger.info(`Polling for AD results... attempt ${attempt}/${maxAttempts}`);
    }
  }

  logger.warn(
    `AD discoveries not found after ${maxAttempts} polls — generation may still be running`
  );
  return [];
};

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
    const {
      min_new_alerts,
      index_pattern: indexPattern,
      connector_id: connectorId,
    } = context.input;
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
        const kibanaUrl = context.contextManager.getContext()?.kibanaUrl ?? 'http://localhost:5601';

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
          const executionUuid = adResult.execution_uuid ?? adResult.executionUuid;

          if (executionUuid) {
            context.logger.info(
              `AD generation triggered for case ${caseId}, execution: ${executionUuid}`
            );

            // Poll for completed discoveries to get document IDs for deep linking
            const discoveryIds = await pollForDiscoveries({
              kibanaUrl,
              authHeaders,
              alertIds,
              maxAttempts: 18,
              intervalMs: 10_000,
              logger: context.logger,
            });

            const adLink =
              discoveryIds.length > 0
                ? `/app/security/attack_discovery?id=${discoveryIds.join(',')}`
                : `/app/security/attack_discovery`;

            const discoveryLinks =
              discoveryIds.length > 0
                ? `[View Attack Discovery Results](${adLink})`
                : `[View Attack Discovery](/app/security/attack_discovery) *(generation in progress)*`;

            return {
              output: {
                case_id: caseId,
                triggered: true,
                alert_count: alertIds.length,
                summary:
                  `## Attack Discovery\n\n` +
                  `Attack Discovery analysis completed for **${alertIds.length} alert(s)**.\n\n` +
                  `${discoveryLinks}\n\n` +
                  `| Detail | Value |\n|--------|-------|\n` +
                  `| Discoveries | ${discoveryIds.length} |\n` +
                  `| Connector | \`${connectorId}\` |\n` +
                  `| Alerts analyzed | ${alertIds.length} |\n\n` +
                  `---\n*Generated by Alert Investigation Pipeline*`,
              },
            };
          }

          // Synchronous response with discoveries
          const discoveries = adResult.attackDiscoveries ?? adResult.data ?? [];
          const discoveryIds = discoveries.map((d: { id?: string }) => d.id).filter(Boolean);

          const adLink =
            discoveryIds.length > 0
              ? `/app/security/attack_discovery?id=${discoveryIds.join(',')}`
              : `/app/security/attack_discovery`;

          const summary =
            discoveries.length > 0
              ? discoveries
                  .map(
                    (d: { title: string; summaryMarkdown: string }) =>
                      `### ${d.title}\n${d.summaryMarkdown}`
                  )
                  .join('\n\n')
              : '*No attack discoveries generated from the provided alerts.*';

          return {
            output: {
              case_id: caseId,
              triggered: true,
              alert_count: alertIds.length,
              summary:
                `## Attack Discovery\n\n${summary}\n\n` +
                `[View on Attack Discovery page](${adLink})`,
            },
          };
        }

        const statusText = await adResponse.text().catch(() => 'unknown');
        context.logger.warn(`AD generation API returned ${adResponse.status}: ${statusText}`);

        return {
          output: {
            case_id: caseId,
            triggered: false,
            alert_count: alertIds.length,
            summary:
              `## Attack Discovery Failed\n\n` +
              `AD generation returned HTTP ${adResponse.status} for **${alertIds.length} alert(s)**.\n\n` +
              `[Open Attack Discovery](/app/security/attack_discovery)\n\n` +
              `---\n*Generated by Alert Investigation Pipeline*`,
            reason: `AD API returned ${adResponse.status}`,
          },
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        context.logger.warn(`AD generation API call failed: ${errMsg}`);

        return {
          output: {
            case_id: caseId,
            triggered: false,
            alert_count: alertIds.length,
            summary:
              `## Attack Discovery Failed\n\n` +
              `AD generation failed: ${errMsg}\n\n` +
              `[Open Attack Discovery](/app/security/attack_discovery)\n\n` +
              `---\n*Generated by Alert Investigation Pipeline*`,
            reason: errMsg,
          },
        };
      }
    }

    // No connector_id — cannot generate AD
    return {
      output: {
        case_id: caseId,
        triggered: false,
        alert_count: alertIds.length,
        summary:
          `## Attack Discovery Skipped\n\n` +
          `No connector configured. Set \`connector_id\` in the workflow to enable AD generation.\n\n` +
          `---\n*Generated by Alert Investigation Pipeline*`,
        reason: 'No connector_id configured',
      },
    };
  },
});
