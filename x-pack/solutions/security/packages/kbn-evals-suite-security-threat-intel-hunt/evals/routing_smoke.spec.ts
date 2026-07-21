/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { tags, evaluate, getToolCallSteps } from '@kbn/evals';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

/**
 * L0 Routing Smoke — verifies that the Agent Builder router correctly invokes
 * (or avoids) the threat-intelligence skill based on user intent.
 *
 * Uses the REAL Agent Builder converse fixture (`agentBuilderClient`) via
 * `@kbn/evals` Playwright infrastructure.  This is a deterministic smoke test,
 * not a scorecard — there is no `executorClient.runExperiment()` loop.
 */

/** Tools registered by the threat-intelligence skill (namespaced IDs from `THREAT_INTEL_TOOL_IDS`). */
const THREAT_INTEL_TOOLS = ['threat_intel.hunt_orchestrator', 'threat_intel.hunt_behavior'];

interface SmokeCase {
  name: string;
  input: string;
  expectSkillInvoked: boolean;
  expectToolCalled: string | null;
  reason: string;
}

const smokeCases: SmokeCase[] = [
  {
    name: 'hunt-positive: natural report request',
    input:
      'A new Mandiant report describes APT29 using stolen Okta session tokens to ' +
      'blend in with legitimate SSO traffic. Hunt for this in our environment.',
    expectSkillInvoked: true,
    expectToolCalled: 'threat_intel.hunt_orchestrator',
    reason: 'Should route to security.threat-intel.hunt skill',
  },
  {
    name: 'hunt-positive: explicit threat-intel language',
    input:
      'We received a threat intelligence report about a new supply-chain ' +
      'compromise targeting npm packages. Please run a continuous threat hunt.',
    expectSkillInvoked: true,
    expectToolCalled: 'threat_intel.hunt_orchestrator',
    reason: 'Explicit mention of threat intel + hunt should route correctly',
  },
  {
    name: 'distractor-negative: alert triage should NOT route to hunt',
    input:
      'We have a high memory usage alert on host prod-web-07. ' +
      'Please investigate and determine if this is malicious.',
    expectSkillInvoked: false,
    expectToolCalled: null,
    reason: 'Alert triage distractor; must NOT invoke threat-intel skill',
  },
  {
    name: 'distractor-negative: generic observability',
    input:
      'My Elasticsearch cluster is experiencing slow queries on the logs-* indices. ' +
      'Can you help diagnose the performance issue?',
    expectSkillInvoked: false,
    expectToolCalled: null,
    reason: 'Observability distractor; no threat-intel intent present',
  },
];

evaluate.describe(
  'Threat Intel Hunt — L0 Routing Smoke',
  { tag: tags.stateful.classic },
  () => {
    smokeCases.forEach(({ name, input, expectSkillInvoked, expectToolCalled, reason }) => {
      evaluate(name, async ({ agentBuilderClient, log }: { agentBuilderClient: any; log: any }) => {
        log.info(`L0 smoke: ${name}`);

        const result = await agentBuilderClient.converse({
          agentId: agentBuilderDefaultAgentId,
          input,
        });

        const toolCalls = getToolCallSteps(result);
        const calledTools = new Set(toolCalls.map((t) => t.tool_id));
        const hitDomainTool = THREAT_INTEL_TOOLS.some((t) => calledTools.has(t));

        // Primary assertion: skill routing boundary
        expect(hitDomainTool).to.eql(
          expectSkillInvoked,
          `Routing boundary failed: ${reason}. Called tools: ${[...calledTools].join(', ') || '(none)'}`
        );

        // Secondary assertion: when invoked, correct tool is reached
        if (expectSkillInvoked && expectToolCalled) {
          expect(calledTools.has(expectToolCalled)).to.eql(
            true,
            `Skill routed but never called ${expectToolCalled}`
          );
        }
      });
    });
  }
);
