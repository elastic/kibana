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

evaluate.describe(
  'C3:L3 | Deep Watch Forensics — Composite pipeline',
  { tag: tags.stateful.classic },
  () => {
    const message = `Escalation: Forensic investigation requested.\n\n${JSON.stringify(
      {
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
      },
      null,
      2
    )}`;

    evaluate(
      'should execute full pipeline: evidence → reconstruction → draft',
      async ({ agentBuilderClient, log }) => {
        const result = await agentBuilderClient.converse({
          agentId: agentBuilderDefaultAgentId,
          input: message,
        });

        const steps = getToolCallSteps(result.steps);
        const toolCalls = steps.filter((s: Record<string, unknown>) => s.type === 'tool_call');
        const toolIds = new Set(
          toolCalls.map((s: Record<string, unknown>) => s.tool_id).filter(Boolean)
        );

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
