/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L4 Durable Outcome — Deep Watch Forensics
 *
 * Per PR #35 pyramid §3: "L4 requires a durable outcome to score. A worker
 * whose findings exist only in an ephemeral tool/chat response has no L4."
 *
 * This spec verifies that produce_draft_forensic_report persists its output
 * to .kibana-deep-watch-forensics-reports, making the report durable and
 * replayable for Evaluation Record scoring.
 *
 * Temporary: uses a custom .kibana index until the platform Investigation
 * (Agent Builder templated conversation) object model is ready.
 */

import { tags, evaluate, getToolCallSteps } from '@kbn/evals';
import {
  DEEP_WATCH_TOOL_IDS,
  DEEP_WATCH_FORENSICS_REPORTS_INDEX,
  agentBuilderDefaultAgentId,
} from '../src/constants';
import { seedForensicTimeline } from '../src/data_generators/forensic_data';
import { cleanupSeededData } from '../src/data_generators/cleanup';

evaluate.describe(
  'C3:L4 | Deep Watch Forensics — Durable Outcome',
  { tag: tags.stateful.classic },
  () => {
    // See leaf_quality.spec.ts for the full rationale: without seeded
    // `logs-endpoint.events.*` telemetry for DESKTOP-APT29, execute_esql
    // always returns zero rows and the agent correctly refuses to draft a
    // report rather than fabricate one — which is the right guardrail
    // behavior, but means this L4 test can never exercise the durable-write
    // path it's meant to score. Root-caused and verified live 2026-07-30.
    evaluate.beforeAll(async ({ esClient, log }) => {
      await cleanupSeededData({ esClient });
      await seedForensicTimeline({ esClient }, log);
    });

    evaluate.afterAll(async ({ esClient }) => {
      await cleanupSeededData({ esClient });
    });

    const message =
      'Forensic investigation requested. APT29 lateral movement on DESKTOP-APT29. ' +
      'C2 IP 185.220.101.42. Perform deep forensic analysis and produce a DRAFT specialist report.';

    evaluate(
      'should persist draft report to the durable index',
      async ({ agentBuilderClient, esClient, log }) => {
        const result = await agentBuilderClient.converse({
          agentId: agentBuilderDefaultAgentId,
          input: message,
        });

        const steps = getToolCallSteps(result);
        const toolIds = new Set(steps.map((s) => s.tool_id).filter(Boolean));

        const produceDraftCalled = toolIds.has(DEEP_WATCH_TOOL_IDS.produce_draft_forensic_report);
        log.info(`[L4] produceDraftCalled=${produceDraftCalled}`);

        // ── Verify persistence ──────────────────────────────────────────────
        let persistedCount = 0;
        let hasEvaluationRecordShape = false;

        try {
          const searchRes = await esClient.search({
            index: DEEP_WATCH_FORENSICS_REPORTS_INDEX,
            query: {
              bool: {
                must: [
                  { match: { report_status: 'DRAFT' } },
                  { range: { '@timestamp': { gte: 'now-5m' } } },
                ],
              },
            },
            size: 5,
            sort: [{ '@timestamp': 'desc' }],
          });

          const hits = (searchRes.hits?.hits ?? []) as Array<{
            _source: Record<string, unknown>;
          }>;
          persistedCount = hits.length;
          log.info(`[L4] Persisted reports found: ${persistedCount}`);

          if (persistedCount > 0) {
            const record = hits[0]._source;
            hasEvaluationRecordShape =
              record.report_status !== undefined &&
              record.timeline !== undefined &&
              record.validated_iocs !== undefined &&
              record.unresolved_questions !== undefined &&
              record.confidence_assessment !== undefined;

            log.info(`[L4] Evaluation Record shape valid: ${hasEvaluationRecordShape}`);
          }
        } catch (e) {
          log.warning(`[L4] ES search failed: ${(e as Error).message}`);
        }

        return {
          success: produceDraftCalled && persistedCount > 0,
          explanation:
            `produce_draft called: ${produceDraftCalled}. ` +
            `Persisted docs: ${persistedCount}. ` +
            `Evaluation Record shape: ${hasEvaluationRecordShape}.`,
          scorecard: {
            produceDraft: produceDraftCalled ? 1 : 0,
            persisted: persistedCount > 0 ? 1 : 0,
            evaluationRecordShape: hasEvaluationRecordShape ? 1 : 0,
          },
        };
      }
    );
  }
);
