/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { tags, evaluate, getToolCallSteps } from '@kbn/evals';
import {
  DEEP_WATCH_FORENSICS_SKILL_ID,
  DEEP_WATCH_TOOL_IDS,
  agentBuilderDefaultAgentId,
} from '../src/constants';

/**
 * L0 Routing Smoke — verifies that the Agent Builder router correctly invokes
 * (or avoids) the deep-watch-forensics skill based on user intent.
 *
 * Uses the REAL Agent Builder converse fixture (`agentBuilderClient`) via
 * `@kbn/evals` Playwright infrastructure. This is a deterministic smoke test,
 * not a scorecard — there is no `executorClient.runExperiment()` loop.
 */

interface SmokeCase {
  name: string;
  input: string;
  expectSkillInvoked: boolean;
  expectToolCalled: string | null;
  reason: string;
}

const smokeCases: SmokeCase[] = [
  {
    name: 'forensics-positive: natural escalation from Dark Watch',
    input:
      'Dark Watch escalated APT29 lateral-movement finding on host DESKTOP-APT29. ' +
      'C2 IP 185.220.101.42, registry persistence detected. Perform a forensic investigation.',
    expectSkillInvoked: true,
    expectToolCalled: DEEP_WATCH_TOOL_IDS.package_evidence,
    reason: 'Should route to deep-watch-forensics skill for forensic analysis',
  },
  {
    name: 'forensics-positive: explicit specialist forensic request',
    input:
      'We need a deep forensic specialist report for host WEB-SERVER-01. ' +
      'Investigate patient zero, attack timeline, and persistence mechanisms. ' +
      'All findings must be DRAFT for specialist review.',
    expectSkillInvoked: true,
    expectToolCalled: DEEP_WATCH_TOOL_IDS.package_evidence,
    reason: 'Explicit forensic request with DRAFT requirement should route correctly',
  },
  {
    name: 'distractor-negative: alert triage should NOT route to forensics',
    input:
      'We have a high memory usage alert on host prod-web-07. ' +
      'Please investigate and determine if this is malicious.',
    expectSkillInvoked: false,
    expectToolCalled: null,
    reason: 'Basic alert triage distractor; must NOT invoke deep-watch-forensics',
  },
  {
    name: 'distractor-negative: threat-hunting should NOT route to forensics',
    input:
      'Fleet-wide IoC hunt for hash d2a5b8e1c4f7a9b3 across all endpoints. ' +
      'Deploy detection rules for registry run-key persistence.',
    expectSkillInvoked: false,
    expectToolCalled: null,
    reason: 'Fleet-wide hunting distractor; use threat-hunting skill, not deep-watch-forensics',
  },
  {
    name: 'distractor-negative: containment request should NOT route to forensics',
    input:
      'Isolate host DESKTOP-APT29 immediately and run a malware scan. ' +
      'Execute response actions now.',
    expectSkillInvoked: false,
    expectToolCalled: null,
    reason: 'Response-action request; use endpoint-response-actions, not deep-watch-forensics',
  },
];

evaluate.describe('Deep Watch Forensics — L0 Routing Smoke', { tag: tags.stateful.classic }, () => {
  smokeCases.forEach(({ name, input, expectSkillInvoked, expectToolCalled, reason }) => {
    evaluate(name, async ({ agentBuilderClient, log }) => {
      log.info(`L0 smoke: ${name}`);

      const result = await agentBuilderClient.converse({
        agentId: agentBuilderDefaultAgentId,
        input,
      });

      const toolCallSteps = getToolCallSteps(result);
      const toolIds = new Set(toolCallSteps.map((s) => s.tool_id).filter(Boolean));

      const skillInvoked = [...toolIds].some((id) =>
        (id as string).includes(DEEP_WATCH_FORENSICS_SKILL_ID)
      );
      const correctToolCalled = expectToolCalled ? toolIds.has(expectToolCalled) : true;

      log.info(
        `L0 result → skillInvoked=${skillInvoked}, correctToolCalled=${correctToolCalled}, toolIds=[${Array.from(
          toolIds
        ).join(', ')}]`
      );

      if (expectSkillInvoked) {
        expect(skillInvoked).to.eql(true, `Expected skill invocation failed — ${reason}`);
        if (expectToolCalled) {
          expect(correctToolCalled).to.eql(
            true,
            `Expected ${expectToolCalled} but got [${Array.from(toolIds).join(', ')}]`
          );
        }
      } else {
        expect(skillInvoked).to.eql(false, `Skill should NOT have been invoked — ${reason}`);
      }
    });
  });
});
