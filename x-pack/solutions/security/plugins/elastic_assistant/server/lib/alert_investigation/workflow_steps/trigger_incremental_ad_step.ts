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

interface DiscoveryResult {
  id: string;
  title: string;
  summaryMarkdown: string;
  mitreTactics: string[];
}

interface PollResult {
  ids: string[];
  discoveries: DiscoveryResult[];
}

/**
 * Poll the AD _find API until discoveries with the matching generation_uuid appear.
 * Returns discovery IDs (for deep linking) and details (title, summary, tactics)
 * so the caller can update case title/description with actual AD findings.
 */
const pollForDiscoveries = async ({
  kibanaUrl,
  authHeaders,
  executionUuid,
  maxAttempts,
  intervalMs,
  logger,
}: {
  kibanaUrl: string;
  authHeaders: Record<string, string>;
  executionUuid: string;
  maxAttempts: number;
  intervalMs: number;
  logger: { info: (msg: string) => void; warn: (msg: string) => void };
}): Promise<PollResult> => {
  const empty: PollResult = { ids: [], discoveries: [] };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const findResponse = await fetch(
        `${kibanaUrl}/api/attack_discovery/_find?per_page=50&sort_order=desc`,
        { headers: authHeaders }
      );

      if (findResponse.ok) {
        const findResult = await findResponse.json();
        const allDiscoveries = findResult.data ?? [];

        // Filter to only discoveries from THIS generation run
        const matched = allDiscoveries.filter(
          (d: { generation_uuid?: string }) => d.generation_uuid === executionUuid
        );

        if (matched.length > 0) {
          const discoveries: DiscoveryResult[] = matched.map(
            (d: {
              id?: string;
              title?: string;
              summary_markdown?: string;
              mitre_attack_tactics?: string[];
            }) => ({
              id: d.id ?? '',
              title: d.title ?? '',
              summaryMarkdown: d.summary_markdown ?? '',
              mitreTactics: d.mitre_attack_tactics ?? [],
            })
          );
          const ids = discoveries.map((d) => d.id).filter(Boolean);
          logger.info(
            `Found ${ids.length} AD discoveries for generation ${executionUuid} after ${attempt} poll(s)`
          );
          return { ids, discoveries };
        }
      }
    } catch {
      // Non-critical — continue polling
    }

    if (attempt % 3 === 0) {
      logger.info(
        `Polling for AD results (generation ${executionUuid})... attempt ${attempt}/${maxAttempts}`
      );
    }
  }

  logger.warn(
    `AD discoveries for generation ${executionUuid} not found after ${maxAttempts} polls`
  );
  return empty;
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
  ad_title: z.string().optional(),
  ad_description: z.string().optional(),
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

    const fallbackTitle = `Investigation — ${alertIds.length} alert(s)`;
    const fallbackDescription = `Alert Investigation Pipeline case for ${alertIds.length} alert(s).`;

    if (alertIds.length < min_new_alerts) {
      return {
        output: {
          case_id: caseId,
          triggered: false,
          alert_count: alertIds.length,
          ad_title: fallbackTitle,
          ad_description: fallbackDescription,
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

            // Poll for completed discoveries matching this generation's UUID
            const pollResult = await pollForDiscoveries({
              kibanaUrl,
              authHeaders,
              executionUuid,
              maxAttempts: 18,
              intervalMs: 10_000,
              logger: context.logger,
            });

            const adLink =
              pollResult.ids.length > 0
                ? `/app/security/attack_discovery?id=${pollResult.ids.join(',')}`
                : `/app/security/attack_discovery`;

            const discoveryLinks =
              pollResult.ids.length > 0
                ? `[View Attack Discovery Results](${adLink})`
                : `[View Attack Discovery](/app/security/attack_discovery) *(generation in progress)*`;

            // Build case title/description from AD findings
            const adTitle = pollResult.discoveries
              .map((d) => d.title)
              .filter(Boolean)
              .join(' | ');

            const tactics = [...new Set(pollResult.discoveries.flatMap((d) => d.mitreTactics))];

            const adDescription = pollResult.discoveries
              .map((d) => d.summaryMarkdown)
              .filter(Boolean)
              .join('\n\n---\n\n');

            return {
              output: {
                case_id: caseId,
                triggered: true,
                alert_count: alertIds.length,
                ad_title: adTitle || `Investigation — ${alertIds.length} alerts`,
                ad_description:
                  adDescription ||
                  `Attack Discovery analysis of ${alertIds.length} alert(s) for case ${caseId}.`,
                summary:
                  `## Attack Discovery\n\n` +
                  `Attack Discovery analysis completed for **${alertIds.length} alert(s)**.\n\n` +
                  `${discoveryLinks}\n\n${
                    tactics.length > 0 ? `**MITRE ATT&CK:** ${tactics.join(', ')}\n\n` : ''
                  }| Detail | Value |\n|--------|-------|\n` +
                  `| Discoveries | ${pollResult.ids.length} |\n` +
                  `| Connector | \`${connectorId}\` |\n` +
                  `| Alerts analyzed | ${alertIds.length} |\n\n` +
                  `---\n*Generated by Alert Investigation Pipeline*`,
              },
            };
          }

          // Synchronous response with discoveries
          const syncDiscoveries = adResult.attackDiscoveries ?? adResult.data ?? [];
          const syncIds = syncDiscoveries.map((d: { id?: string }) => d.id).filter(Boolean);

          const adLink =
            syncIds.length > 0
              ? `/app/security/attack_discovery?id=${syncIds.join(',')}`
              : `/app/security/attack_discovery`;

          const syncTitle = syncDiscoveries
            .map((d: { title?: string }) => d.title)
            .filter(Boolean)
            .join(' | ');

          const syncDescription = syncDiscoveries
            .map(
              (d: { summaryMarkdown?: string; summary_markdown?: string }) =>
                d.summaryMarkdown ?? d.summary_markdown ?? ''
            )
            .filter(Boolean)
            .join('\n\n---\n\n');

          const summary =
            syncDiscoveries.length > 0
              ? syncDiscoveries
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
              ad_title: syncTitle || `Investigation — ${alertIds.length} alerts`,
              ad_description:
                syncDescription ||
                `Attack Discovery analysis of ${alertIds.length} alert(s) for case ${caseId}.`,
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
            ad_title: fallbackTitle,
            ad_description: fallbackDescription,
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
            ad_title: fallbackTitle,
            ad_description: fallbackDescription,
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
        ad_title: fallbackTitle,
        ad_description: fallbackDescription,
        summary:
          `## Attack Discovery Skipped\n\n` +
          `No connector configured. Set \`connector_id\` in the workflow to enable AD generation.\n\n` +
          `---\n*Generated by Alert Investigation Pipeline*`,
        reason: 'No connector_id configured',
      },
    };
  },
});
