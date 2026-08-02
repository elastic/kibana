/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { validateAgentId } from '@kbn/agent-builder-common/agents';

import {
  PND_INCIDENT_AGENT_ID,
  PND_INVESTIGATION_AGENT_ID,
  PND_TUNING_AGENT_ID,
} from '../../../common/constants';
import { PND_AGENTS } from '.';

const byId = (id: string) => PND_AGENTS.find((agent) => agent.id === id);

describe('PND_AGENTS', () => {
  it('defines exactly one agent per phase', () => {
    expect(PND_AGENTS).toHaveLength(3);
  });

  it('defines them under the three exported ids', () => {
    expect(PND_AGENTS.map(({ id }) => id)).toEqual([
      PND_INVESTIGATION_AGENT_ID,
      PND_INCIDENT_AGENT_ID,
      PND_TUNING_AGENT_ID,
    ]);
  });

  // Drift guard against the platform's own validator rather than a restatement of its rules: this
  // is the check `ensureSystemAgent` runs, so a rename that would make `agents.ensure()` throw at
  // runtime fails here instead.
  it.each(PND_AGENTS.map(({ id }) => id))('accepts %s as a system-installed agent id', (id) => {
    expect(validateAgentId({ agentId: id, builtIn: true })).toBeUndefined();
  });

  // Omitting `type` is what keeps A2 inside the "no allow-list edits" constraint: the agent defaults
  // to the chat type, so no AGENT_BUILDER_AGENT_TYPES entry is needed.
  it.each(PND_AGENTS.map((agent) => [agent.id, agent] as const))(
    'omits the agent type on %s so it defaults to the chat type',
    (_id, agent) => {
      expect(agent.type).toBeUndefined();
    }
  );

  // Public access is load-bearing, not cosmetic: `conversations.list()` intersects on the agent ids
  // the caller can access, so a non-public agent would silently drop its conversations out of the
  // chats view for every analyst who cannot "use" it.
  it.each(PND_AGENTS.map((agent) => [agent.id, agent] as const))(
    'makes %s publicly accessible so its conversations stay listable',
    (_id, agent) => {
      expect(agent.access_control).toEqual({ access_mode: AgentAccessControlMode.Public });
    }
  );

  it.each(PND_AGENTS.map((agent) => [agent.id, agent] as const))(
    'gives %s a persona',
    (_id, agent) => {
      expect(agent.configuration.instructions?.length).toBeGreaterThan(0);
    }
  );

  it.each(PND_AGENTS.map((agent) => [agent.id, agent] as const))(
    'gives %s a description',
    (_id, agent) => {
      expect(agent.description.length).toBeGreaterThan(0);
    }
  );

  it('backs the investigation agent with the specific-alert triage skills', () => {
    expect(byId(PND_INVESTIGATION_AGENT_ID)?.configuration.skill_ids).toEqual([
      'alert-analysis',
      'entity-analytics',
      'threat-hunting',
    ]);
  });

  it('backs the incident agent with the corroboration skills', () => {
    expect(byId(PND_INCIDENT_AGENT_ID)?.configuration.skill_ids).toEqual([
      'alert-analysis',
      'entity-analytics',
    ]);
  });

  it('backs the tuning agent with the rule-management skills', () => {
    expect(byId(PND_TUNING_AGENT_ID)?.configuration.skill_ids).toEqual([
      'detection-rule-edit',
      'find-security-rules',
      'investigate-rule',
    ]);
  });

  // `alert-triage` ranks the WHOLE alert queue "without investigating individual alerts", so it
  // would add latency and contribute nothing to "is this specific discovery a real incident?" —
  // which is the question workstream E reads the verdict of.
  it('never selects the queue-ranking alert-triage skill', () => {
    const every = PND_AGENTS.flatMap(({ configuration }) => configuration.skill_ids ?? []);

    expect(every).not.toContain('alert-triage');
  });

  /**
   * Verified live on a default stack: `security.run_rule_preview` is registered only behind
   * `experimentalFeatures.rulePreviewAttachmentEnabled` (default false), and creating an agent that
   * selects it fails with `Tool id 'security.run_rule_preview' does not exist`. `agents.ensure()` does
   * not run that validation, so selecting it would install fine and degrade fine at execution — but
   * would leave the agent **un-editable**, since every update does run it. Hence no tool selection,
   * which is the plan's own named fallback.
   */
  it('selects no tools at all, so no agent can be made un-editable by an unregistered tool id', () => {
    expect(PND_AGENTS.map(({ configuration }) => configuration.tools)).toEqual(
      PND_AGENTS.map(() => [{ tool_ids: [] }])
    );
  });

  it('never selects the rule-preview tool, which does not exist on a default stack', () => {
    const every = PND_AGENTS.flatMap(({ configuration }) =>
      configuration.tools.flatMap(({ tool_ids: toolIds }) => toolIds)
    );

    expect(every).not.toContain('security.run_rule_preview');
  });

  it('never selects every tool by wildcard', () => {
    const every = PND_AGENTS.flatMap(({ configuration }) =>
      configuration.tools.flatMap(({ tool_ids: toolIds }) => toolIds)
    );

    expect(every).not.toContain('*');
  });
});
