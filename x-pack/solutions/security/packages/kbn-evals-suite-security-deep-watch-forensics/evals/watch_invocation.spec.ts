/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Watch Invocation Glue Spec — Deep Watch Forensics
 *
 * Verifies that the real Deep Watch Worker `ai.agent` step
 * (`watch_deep_worker.yaml`) invokes the `deep-watch-forensics` skill and
 * calls `package_evidence`.
 *
 * IMPORTANT: `watch_deep_worker.yaml` does NOT rely on natural-language
 * routing. Per CWL Option 2 (Slack C0BHGGA6PHC/p1784742716537469,
 * elastic/kibana#280617), the step sets
 * `configuration_overrides.skill_ids: [deep-watch-forensics]` — a runtime
 * straight-replace of the agent's skill list — and the hydrated message
 * explicitly references `[/deep-watch-forensics](skill://deep-watch-forensics)`.
 * An earlier version of this spec sent a bare JSON escalation-context blob
 * through unconstrained natural routing (no configuration_overrides), which
 * doesn't reflect any real invocation path: `watch_deep.yaml` (the
 * orchestrator-facing file this spec's original docstring cited) is an
 * unimplemented skeleton, and the real worker never routes without an
 * explicit skill override. Live-verified 2026-07-30: that unconstrained
 * shape actually routes to `endpoint-forensic-analysis`, not
 * `deep-watch-forensics` — a real router ambiguity, but not the bug this
 * spec is meant to catch (which is: does the Watch's actual invocation path
 * work).
 *
 * YAML structure assertions live in the PND plugin Jest tests
 * (`managed_workflows.test.ts`) to avoid duplicating file I/O in Playwright.
 * This spec covers the routing boundary only (YAML → conversation → skill).
 */

import expect from '@kbn/expect';
import { tags, evaluate, getToolCallSteps } from '@kbn/evals';
import {
  DEEP_WATCH_FORENSICS_SKILL_ID,
  DEEP_WATCH_TOOL_NAMESPACE,
  DEEP_WATCH_TOOL_IDS,
  agentBuilderDefaultAgentId,
} from '../src/constants';

evaluate.describe('Deep Watch Forensics — Watch Invocation', { tag: tags.stateful.classic }, () => {
  /**
   * Replicates the hydrated message template + configuration_overrides from
   * `watch_deep_worker.yaml`'s `forensic_investigation` ai.agent step. The
   * `{{ inputs.escalation | json }}` Liquid interpolation is inlined here
   * with realistic escalation context rather than read from the file, per
   * this suite's existing convention (see `composite_pipeline.spec.ts`).
   */
  evaluate(
    'should route hydrated watch message to deep-watch-forensics skill',
    async ({ agentBuilderClient, log }) => {
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
        'You already have the endpoint telemetry and IoC context you need for ' +
        'historical reconstruction; reason from the evidence and return a single ' +
        'structured draft report. Do NOT ask questions. Do NOT execute response actions.\n\n' +
        `Escalation context:\n${JSON.stringify(escalationContext, null, 2)}`;

      log.info(`Watch invocation message length: ${message.length}`);

      const result = await agentBuilderClient.converse({
        agentId: agentBuilderDefaultAgentId,
        input: message,
        // Matches watch_deep_worker.yaml's runtime override — the real Watch
        // invocation path never relies on unconstrained natural routing.
        configurationOverrides: { skillIds: [DEEP_WATCH_FORENSICS_SKILL_ID] },
      });

      const toolCallSteps = getToolCallSteps(result);
      const toolIds = new Set(toolCallSteps.map((s) => s.tool_id).filter(Boolean));

      const skillInvoked = [...toolIds].some(
        (id) =>
          (id as string).includes(DEEP_WATCH_FORENSICS_SKILL_ID) ||
          (id as string).includes(DEEP_WATCH_TOOL_NAMESPACE)
      );
      const packageEvidenceCalled = toolIds.has(DEEP_WATCH_TOOL_IDS.package_evidence);

      log.info(
        `Watch invocation → skillInvoked=${skillInvoked}, packageEvidence=${packageEvidenceCalled}`
      );

      expect(skillInvoked).to.eql(
        true,
        'Hydrated watch message should route to deep-watch-forensics skill'
      );
      expect(packageEvidenceCalled).to.eql(
        true,
        'deep-watch-forensics should call package_evidence tool'
      );
    }
  );
});
