/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L3: Composite Pipeline Spec — Deep Watch Forensics
 * Tests the full multi-tool orchestration:
 *   1. package_evidence accumulates telemetry
 *   2. generate_esql + execute_esql reconstruct process tree
 *   3. produce_draft generates report with all sections
 *
 * Fixture: seeded endpoint docs matching DEFAULT_ESCALATION_CONTEXT.
 */

import { tags, evaluate, getToolCallSteps } from '@kbn/evals';
import {
  DEEP_WATCH_TOOL_IDS,
  DEEP_WATCH_FORENSICS_SKILL_ID,
  agentBuilderDefaultAgentId,
} from '../src/constants';
import { seedForensicTimeline } from '../src/data_generators/forensic_data';
import { cleanupSeededData } from '../src/data_generators/cleanup';

evaluate.describe(
  'C3:L3 | Deep Watch Forensics — Composite pipeline',
  { tag: tags.stateful.classic },
  () => {
    // The fixture named in this spec's header is not ambient — it has to be
    // seeded. Without it `execute_esql` returns zero rows and the agent
    // correctly-but-unhelpfully stops at "insufficient evidence" instead of
    // reaching `produce_draft_forensic_report`, so `produceDraftCalled` below
    // fails for reasons that have nothing to do with the model. Same root cause
    // and same remedy as the sibling leaf_quality/durable_outcome specs
    // (verified live 2026-07-30).
    evaluate.beforeAll(async ({ esClient, log }) => {
      await cleanupSeededData({ esClient });
      await seedForensicTimeline({ esClient }, log);
    });

    evaluate.afterAll(async ({ esClient }) => {
      await cleanupSeededData({ esClient });
    });

    // Replicates the real Watch invocation path from `watch_deep_worker.yaml`'s
    // `forensic_investigation` ai.agent step. Per CWL Option 2 (Slack
    // C0BHGGA6PHC/p1784742716537469, elastic/kibana#280617), that step performs
    // a runtime straight-replace of the agent's skill list via
    // `configuration_overrides.skill_ids: [deep-watch-forensics]` AND hydrates a
    // message that explicitly references `skill://deep-watch-forensics`. An
    // earlier version of this spec sent a bare `Escalation: ...` + raw-JSON blob
    // through unconstrained natural routing, which reflects no real invocation
    // path — live-verified 2026-07-30 that shape routes to
    // `endpoint-forensic-analysis`, not `deep-watch-forensics`. This spec covers
    // the full multi-tool pipeline over the Watch's actual invocation path.
    const escalationContext = {
      alert_id: 'alert-apt29-lateral',
      alert_name: 'APT29 Lateral Movement Detected',
      severity: 'critical',
      host_name: 'DESKTOP-APT29',
      host_os: 'windows',
      source_ip: '10.0.1.15',
      timestamp: '2025-07-20T14:32:00Z',
      alert_description:
        'Suspicious service creation and registry persistence detected on endpoint.',
      rule_name: 'APT29 Lateral Movement — Service Creation',
      category: 'Lateral Movement',
      mitre_tactic: ['TA0008'],
      mitre_technique: ['T1021.002', 'T1543.003'],
    };

    const message =
      'Use the [/deep-watch-forensics](skill://deep-watch-forensics) skill to ' +
      'perform a forensic investigation of the escalated threat context below. ' +
      'Package the endpoint evidence, reconstruct the process activity with ES|QL, ' +
      'and return a single structured draft report. Do NOT ask questions. ' +
      'Do NOT execute response actions.\n\n' +
      `Escalation context:\n${JSON.stringify(escalationContext, null, 2)}`;

    evaluate(
      'should execute full pipeline: evidence → reconstruction → draft',
      async ({ agentBuilderClient, log }) => {
        const result = await agentBuilderClient.converse({
          agentId: agentBuilderDefaultAgentId,
          input: message,
          // Matches watch_deep_worker.yaml's runtime override — the real Watch
          // invocation path never relies on unconstrained natural routing.
          configurationOverrides: { skillIds: [DEEP_WATCH_FORENSICS_SKILL_ID] },
        });

        const toolCallSteps = getToolCallSteps(result);
        const toolIds = new Set(toolCallSteps.map((s) => s.tool_id).filter(Boolean));

        // --- Evidence packaging + ES|QL phase ---
        const packageEvidenceCalled = toolIds.has(DEEP_WATCH_TOOL_IDS.package_evidence);
        const esqlGenerated = [...toolIds].some((id) => String(id).includes('generate_esql'));
        const esqlExecuted = [...toolIds].some((id) => String(id).includes('execute_esql'));

        log.info(
          `[L3] Tools → packageEvidence=${packageEvidenceCalled}, esqlGen=${esqlGenerated}, esqlExec=${esqlExecuted}`
        );

        // --- Draft production phase ---
        const produceDraftCalled = toolIds.has(DEEP_WATCH_TOOL_IDS.produce_draft_forensic_report);
        const skillInvoked = [...toolIds].some((id) =>
          String(id).includes(DEEP_WATCH_FORENSICS_SKILL_ID)
        );

        log.info(`[L3] Draft → skillInvoked=${skillInvoked}, produceDraft=${produceDraftCalled}`);

        return {
          success: packageEvidenceCalled && esqlGenerated && esqlExecuted && produceDraftCalled,
          explanation: `Skill invoked: ${skillInvoked}. Tools: packageEvidence=${packageEvidenceCalled}, esqlGen=${esqlGenerated}, esqlExec=${esqlExecuted}, produceDraft=${produceDraftCalled}.`,
          scorecard: {
            packageEvidence: packageEvidenceCalled ? 1 : 0,
            esqlGenerated: esqlGenerated ? 1 : 0,
            esqlExecuted: esqlExecuted ? 1 : 0,
            produceDraft: produceDraftCalled ? 1 : 0,
            skillInvoked: skillInvoked ? 1 : 0,
          },
        };
      }
    );
  }
);
