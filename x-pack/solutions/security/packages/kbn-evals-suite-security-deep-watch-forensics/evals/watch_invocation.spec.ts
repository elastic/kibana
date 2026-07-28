/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Watch Invocation Glue Spec — Deep Watch Forensics
 *
 * Verifies that a message with the same shape as the Deep Watch `ai.agent` step
 * (hydrated with realistic escalation context) routes through the Agent Builder
 * to the `deep-watch-forensics` skill and invokes `package_evidence`.
 *
 * YAML structure assertions live in the PND plugin Jest tests
 * (`managed_workflows.test.ts`) to avoid duplicating file I/O in Playwright.
 * This spec covers the routing boundary only (YAML → conversation → skill).
 */

import expect from '@kbn/expect';
import { tags, evaluate, getToolCallSteps } from '@kbn/evals';
import {
  DEEP_WATCH_FORENSICS_SKILL_ID,
  DEEP_WATCH_TOOL_IDS,
  agentBuilderDefaultAgentId,
} from '../src/constants';

evaluate.describe('Deep Watch Forensics — Watch Invocation', { tag: tags.stateful.classic }, () => {
  /**
   * Replicates the hydrated message template from `watch_deep.yaml` without
   * reading the file. The goal is to prove that a realistic escalation context
   * hitting the router resolves to the deep-watch-forensics skill.
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

      const message = `Forensic investigation requested for escalation.\n\n${JSON.stringify(
        escalationContext,
        null,
        2
      )}`;

      log.info(`Watch invocation message length: ${message.length}`);

      const result = await agentBuilderClient.converse({
        agentId: agentBuilderDefaultAgentId,
        input: message,
      });

      const toolCallSteps = getToolCallSteps(result);
      const toolIds = new Set(toolCallSteps.map((s) => s.tool_id).filter(Boolean));

      const skillInvoked = [...toolIds].some((id) =>
        String(id).includes(DEEP_WATCH_FORENSICS_SKILL_ID)
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
