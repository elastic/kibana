/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import dedent from 'dedent';
import { apiPrivileges } from '@kbn/onechat-plugin/common/features';
import { MessageRole } from '@kbn/inference-common';
import type { ObservabilityAgentPluginStartDependencies } from '../../types';

export function registerAiInsightRoutes(
  core: CoreSetup<ObservabilityAgentPluginStartDependencies>,
  logger: Logger
) {
  const router = core.http.createRouter();

  router.post(
    {
      path: '/internal/observability_agent/ai_insights/alert',
      validate: {
        body: schema.object({
          alertId: schema.string(),
          connectorId: schema.maybe(schema.string()),
        }),
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readOnechat],
        },
      },
    },
    async (context, request, response) => {
      try {
        const { connectorId, alertId } = request.body;
        const [, pluginsStart] = await core.getStartServices();
        const inference = pluginsStart.inference;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        try {
          const alertSearch = await esClient.search({
            index: ['.alerts-observability*'],
            size: 1,
            track_total_hits: false,
            ignore_unavailable: true,
            query: { term: { 'kibana.alert.uuid': alertId } },
            _source: true,
          });
          const hit = alertSearch.hits.hits[0];
          if (hit?._source) {
            logger.debug(
              `AI insight: fetched alert ${alertId} from .alerts-observability*: ${JSON.stringify(
                hit._source
              )}`
            );
          } else {
            logger.debug(`AI insight: alert ${alertId} not found in .alerts-observability*`);
          }
        } catch (err) {
          logger.error(
            `AI insight: error fetching alert ${alertId} from .alerts-observability*: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }

        const relatedContext = 'TBD';
        const inferenceClient = inference.getClient({ request });

        const system = dedent(`
 You are an SRE assistant. Help an SRE quickly understand likely cause, impact, and next actions for this alert using the provided context.

        Output shape (plain text):
        - Summary (1–2 sentences): What is likely happening and why it matters. If recovered, acknowledge and reduce urgency. If no strong signals, say “Inconclusive” and briefly note why.
        - Assessment: Most plausible explanation or “Inconclusive” if signals do not support a clear assessment.
        - Related signals (top 3–5, each with provenance and relevance): For each item, include source (change points | errors | log rate | log categories | anomalies | service summary), timeframe near alert start, and relevance to alert scope as Direct | Indirect | Unrelated.
        - Immediate actions (2–3): Concrete next checks or fixes an SRE can take now.

        Guardrails:
        - Do not repeat the alert reason string or rule name verbatim.
        - Only provide a non‑inconclusive Assessment when supported by on‑topic related signals; otherwise set Assessment to “Inconclusive” and do not speculate a cause.
        - Corroboration: prefer assessment supported by multiple independent signal types; if only one source supports it, state that support is limited.
        - If signals are weak or conflicting, state that clearly and recommend the safest next diagnostic step.
        - Do not list raw alert fields as bullet points. Bullets are allowed only for Related signals and Immediate actions.
        - Keep it concise (~150–200 words).

        Related signals hierarchy (use what exists, skip what doesn’t):
        1) Change points (service and exit‑span): sudden shifts in throughput/latency/failure; name impacted downstream services verbatim when present and whether propagation is likely.
        2) Errors: signatures enriched with downstream resource/name; summarize patterns without long stacks; tie to alert scope.
        3) Logs: strongest log‑rate significant items and top categories; very short examples and implications; tie to alert scope.
        4) Anomalies: note ML anomalies around alert time; multiple affected services may imply systemic issues.
        5) Service summary: only details that materially change interpretation (avoid re‑listing fields).

        Recovery / false positives:
        - If recovered or normalizing, recommend light‑weight validation and watchful follow‑up.
        - If inconclusive or signals skew Indirect/Unrelated, state that the alert may be unrelated/noisy and suggest targeted traces/logging for the suspected path.
        `);

        const prompt = dedent(`

          Context:
          ${relatedContext}

          Task:
          Summarize likely cause, impact, and immediate next checks for this alert using the format above. Tie related signals to the alert scope; ignore unrelated noise. If signals are weak or conflicting, mark Assessment “Inconclusive” and propose the safest next diagnostic step.
        `);

        const completion = await inferenceClient.chatComplete({
          connectorId: connectorId ?? '',
          system,
          messages: [{ role: MessageRole.User, content: prompt }],
          temperature: 0.2,
        });

        return response.ok({
          body: {
            summary: completion.content ?? '',
            context: relatedContext ?? '',
          },
        });
      } catch (e) {
        logger.error(
          `AI insight alert endpoint failed: ${e instanceof Error ? e.message : String(e)}`
        );
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to generate AI insight summary' },
        });
      }
    }
  );
}
