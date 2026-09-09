/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L4 Durable Outcome — Watch Floor.
 *
 * Per PR #35 pyramid §3: "L4 requires a durable outcome to score. A worker
 * whose findings exist only in an ephemeral tool/chat response has no L4."
 * Per the Evaluation & Trust execution brief's own done-criteria: "no
 * document still describes the ... Evaluation Record producer relationship
 * as unresolved" — this spec is the proof that relationship actually holds
 * for Watch Floor, the FPR working group's committed first slice
 * (`fpr-golden-v0`).
 *
 * `kbn-evals-suite-alert-analysis-workflow` already covers the shared
 * `alert-analysis` skill's classification accuracy across 46 golden/broken
 * scenarios, but it drives that skill through a separate, pre-existing
 * `system-security-alert-analysis` managed workflow — it never touches
 * PND's own `_emit_proposal` route or writes a `WorkerEvaluationRecord`.
 * This spec closes that specific gap: it drives the REAL `system-security
 * -watch-floor` orchestrator end-to-end (enrich -> ai.agent triage via the
 * same alert-analysis skill -> emit_proposal) against a seeded Defend alert,
 * and asserts a `WorkerEvaluationRecord` is durably persisted to
 * `pnd-worker-evaluations` with the shape E&T scores against
 * (see server/common/schemas/worker_evaluation_record.ts).
 *
 * Model-agnostic via `genAi:defaultAIConnector`, same pattern as
 * escalation_chain_composite.spec.ts. Drives Floor via the REAL alert-trigger
 * path (`inputs.event = { triggerType: 'alert', alertIds: [...] }`), which
 * `preprocessAlertInputs` (run_workflow.ts) expands into `event.alerts[]` —
 * the same shape a live Defend detection rule connector produces. Floor's
 * `run_floor_worker` step reads `event.alerts[0]._id` primarily and only
 * falls back to `trigger.context.alertId` on a bare manual trigger; that
 * fallback is currently dead (there is no `trigger` key in the workflow
 * template context — see `build_workflow_context.ts`), so the alert-trigger
 * path is also the only one that actually threads a real investigationId.
 */

import { randomUUID } from 'crypto';
import { tags, evaluate } from '@kbn/evals';
import { ExecutionStatus } from '@kbn/workflows';
import { WATCH_WORKFLOW_IDS } from '../src/constants';
import { runWatchWorkflow } from '../src/workflow_task';

const DETECTION_ALERTS_INDEX = '.alerts-security.alerts-default';
const WORKER_EVAL_INDEX = 'pnd-worker-evaluations';

evaluate.describe(
  'C-watch-floor:L4 | Watch Floor — Durable Outcome (WorkerEvaluationRecord)',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ kbnClient, connector, log }) => {
      log.info(`[L4] Setting genAi:defaultAIConnector to '${connector.id}' for Watch Floor`);
      await kbnClient.uiSettings.update({
        'genAi:defaultAIConnector': connector.id,
      });
    });

    evaluate(
      'Floor triage of a seeded alert persists a WorkerEvaluationRecord',
      async ({ fetch, esClient, log, connector }) => {
        const runToken = `${connector.id}-${Date.now()}-${randomUUID().slice(0, 8)}`;
        const alertId = `eval-floor-l4-${runToken}`;
        const ruleUuid = `${alertId}-rule`;

        // A minimal, realistic detection-engine alert — enough for the Floor
        // Worker's `_enrich_alert` route (enrich_alert.ts) to build ground
        // truth: rule name/severity/reason and a high-precision MITRE
        // technique, so the alert-analysis skill has a real signal to
        // classify true_positive on (mirrors synthetic_alerts.ts's Tier 2
        // shape in kbn-evals-suite-alert-analysis-workflow).
        await esClient.index({
          index: DETECTION_ALERTS_INDEX,
          id: alertId,
          document: {
            '@timestamp': new Date().toISOString(),
            'kibana.alert.uuid': alertId,
            'kibana.alert.severity': 'high',
            'kibana.alert.reason':
              'Unsigned process powershell.exe with an encoded command executed on WKSTN-EVAL01, ' +
              '4 minutes after a suspicious email attachment was opened.',
            'kibana.alert.rule.uuid': ruleUuid,
            'kibana.alert.rule.rule_id': ruleUuid,
            'kibana.alert.rule.name': 'Suspicious PowerShell Encoded Command Execution',
            'kibana.alert.rule.consumer': 'siem',
            'kibana.alert.rule.producer': 'siem',
            'kibana.alert.rule.rule_type_id': 'siem.queryRule',
            'kibana.alert.rule.threat': [{ technique: [{ id: 'T1059.001', name: 'PowerShell' }] }],
            'kibana.alert.workflow_status': 'open',
            'process.entity_id': `entity-${alertId}`,
            'host.id': `host-${alertId}`,
            'host.name': 'WKSTN-EVAL01',
          },
          refresh: 'wait_for',
        });

        try {
          log.info(
            `[L4] Invoking Watch Floor via real alert-trigger path, alertId=${alertId}, connector=${connector.id}`
          );

          const execution = await runWatchWorkflow({
            fetch,
            log,
            workflowId: WATCH_WORKFLOW_IDS.floor,
            // Real alert-trigger shape: `preprocessAlertInputs` (run_workflow.ts)
            // detects `event.triggerType === 'alert'`, mgets the alert doc by
            // {_id, _index}, and expands it into `event.alerts[]` via
            // buildAlertEvent — the exact contract a live Defend detection
            // rule connector produces.
            inputs: {
              event: {
                triggerType: 'alert',
                alertIds: [{ _id: alertId, _index: DETECTION_ALERTS_INDEX }],
              },
            },
          });

          log.info(`[L4] Floor execution ${execution.executionId} → ${execution.status}`);

          const executionOk = execution.status !== ExecutionStatus.FAILED;

          // Give the orchestrator's on-failure:continue emit_proposal step a
          // moment to finish its ES write after the top-level execution
          // reports terminal (same rationale as escalation_chain_composite.spec.ts).
          await new Promise((resolve) => setTimeout(resolve, 5_000));

          let record: Record<string, unknown> | undefined;
          try {
            // Floor mints `inv-floor-<alertId>` deterministically from
            // `event.alerts[0]._id` (see watch_floor_orchestrator.yaml) rather
            // than a random uuid, so search on the alertId-derived id. Filter
            // on `watch: 'watch-floor'` too — Floor's high-confidence verdict
            // escalates the SAME investigationId through Dark/Deep/Detection,
            // so a bare investigationId-only + latest-createdAt query would
            // pick up a downstream tier's record instead of Floor's own.
            const searchRes = await esClient.search({
              index: WORKER_EVAL_INDEX,
              size: 1,
              query: {
                bool: {
                  filter: [
                    { term: { investigationId: `inv-floor-${alertId}` } },
                    { term: { watch: 'watch-floor' } },
                  ],
                },
              },
              sort: [{ createdAt: { order: 'desc' as const } }],
            });
            const hit = searchRes.hits?.hits?.[0];
            record = hit?._source as Record<string, unknown> | undefined;
          } catch (e) {
            log.warning(`[L4] pnd-worker-evaluations search failed: ${(e as Error).message}`);
          }

          const persisted = record != null;
          const hasRecordShape =
            record != null &&
            typeof record.verdict === 'string' &&
            typeof record.confidence === 'number' &&
            record.watch === 'watch-floor' &&
            record.provenance != null &&
            record.evidenceRefs != null;

          log.info(
            `[L4] persisted=${persisted}, hasRecordShape=${hasRecordShape}, ` +
              `record=${JSON.stringify(record)}`
          );

          return {
            success: executionOk && persisted && hasRecordShape,
            explanation:
              `Floor execution status: ${execution.status}. ` +
              `WorkerEvaluationRecord persisted: ${persisted}. ` +
              `Record shape valid: ${hasRecordShape}.`,
            scorecard: {
              floorExecutionNonError: executionOk ? 1 : 0,
              workerEvalPersisted: persisted ? 1 : 0,
              workerEvalRecordShapeValid: hasRecordShape ? 1 : 0,
            },
          };
        } finally {
          await esClient
            .delete({ index: DETECTION_ALERTS_INDEX, id: alertId, refresh: true })
            .catch(() => {});
        }
      }
    );
  }
);
