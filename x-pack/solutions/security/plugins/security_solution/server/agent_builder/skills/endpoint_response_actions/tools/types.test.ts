/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  endpointNotFoundData,
  insufficientPrivilegesResult,
  resolveAgentTypeFromPackages,
  responseActionErrorResult,
  summarizeActionHosts,
  summarizeActionOutputs,
  summarizeAgentState,
  MAX_ACTION_HOSTS,
  MAX_AGENT_STATE_ENTRIES,
  MAX_AGENT_STATE_TOTAL_CHARS,
  MAX_OUTPUT_AGENTS,
  MAX_OUTPUT_DEPTH,
  MAX_OUTPUT_ENTRIES_PER_AGENT,
  MAX_OUTPUT_STRING_LENGTH,
} from './types';
import { ToolResultType } from '@kbn/agent-builder-common';

describe('response action error helpers', () => {
  it('responseActionErrorResult returns a typed error envelope', () => {
    const result = responseActionErrorResult('unknown_error', 'Action missing');

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual({
      error: 'unknown_error',
      message: 'Action missing',
    });
  });

  it('insufficientPrivilegesResult includes the privilege field', () => {
    const result = insufficientPrivilegesResult('canIsolateHost');

    expect(result.results[0].data).toEqual(
      expect.objectContaining({
        error: 'insufficient_privileges',
        privilege: 'canIsolateHost',
      })
    );
  });

  it('endpointNotFoundData returns a consistent not-found shape', () => {
    expect(endpointNotFoundData('lost-host')).toEqual(
      expect.objectContaining({
        kind: 'response_action_result',
        hostName: 'lost-host',
        found: false,
        reason: 'endpoint_not_found',
        isolated: false,
        lastSeen: null,
      })
    );
  });
});

describe('resolveAgentTypeFromPackages', () => {
  it('defaults to endpoint when packages is undefined', () => {
    expect(resolveAgentTypeFromPackages(undefined)).toBe('endpoint');
  });

  it('defaults to endpoint when packages is empty', () => {
    expect(resolveAgentTypeFromPackages([])).toBe('endpoint');
  });

  it('defaults to endpoint when no known package is present', () => {
    expect(resolveAgentTypeFromPackages(['some_other_integration'])).toBe('endpoint');
  });

  it('resolves endpoint from the endpoint package', () => {
    expect(resolveAgentTypeFromPackages(['endpoint'])).toBe('endpoint');
  });

  it('resolves sentinel_one from the sentinel_one package', () => {
    expect(resolveAgentTypeFromPackages(['sentinel_one'])).toBe('sentinel_one');
  });

  it('resolves crowdstrike from the crowdstrike package', () => {
    expect(resolveAgentTypeFromPackages(['crowdstrike'])).toBe('crowdstrike');
  });

  it('resolves microsoft_defender_endpoint from the microsoft_defender_endpoint package', () => {
    expect(resolveAgentTypeFromPackages(['microsoft_defender_endpoint'])).toBe(
      'microsoft_defender_endpoint'
    );
  });

  it('resolves microsoft_defender_endpoint from the legacy m365_defender package', () => {
    expect(resolveAgentTypeFromPackages(['m365_defender'])).toBe('microsoft_defender_endpoint');
  });

  it('resolves the matching agent type when multiple unrelated packages are installed', () => {
    expect(resolveAgentTypeFromPackages(['fleet_server', 'sentinel_one', 'system'])).toBe(
      'sentinel_one'
    );
  });
});

describe('summarizeActionOutputs', () => {
  it('returns undefined when there are no outputs', () => {
    expect(summarizeActionOutputs(undefined)).toBeUndefined();
    expect(summarizeActionOutputs(null)).toBeUndefined();
  });

  it('passes small outputs through unchanged', () => {
    const result = summarizeActionOutputs({
      'agent-1': { entries: [{ stdout: 'ok' }] },
    });

    expect(result).toEqual({
      agents: [{ agentId: 'agent-1', entries: [{ stdout: 'ok' }], totalEntries: 1 }],
      totalAgents: 1,
    });
  });

  it('caps the number of agents and reports how many were dropped', () => {
    const outputs: Record<string, unknown> = {};
    for (let i = 0; i < MAX_OUTPUT_AGENTS + 3; i++) {
      outputs[`agent-${i}`] = { entries: [] };
    }

    const result = summarizeActionOutputs(outputs)!;

    expect(result.agents).toHaveLength(MAX_OUTPUT_AGENTS);
    expect(result.totalAgents).toBe(MAX_OUTPUT_AGENTS + 3);
    expect(result.agentsTruncated).toBe(3);
  });

  it('caps entries per agent and reports the dropped count', () => {
    const entries = Array.from({ length: MAX_OUTPUT_ENTRIES_PER_AGENT + 5 }, (_, i) => ({ i }));

    const result = summarizeActionOutputs({ 'agent-1': { entries } })!;

    expect(result.agents[0].entries).toHaveLength(MAX_OUTPUT_ENTRIES_PER_AGENT);
    expect(result.agents[0].totalEntries).toBe(MAX_OUTPUT_ENTRIES_PER_AGENT + 5);
    expect(result.agents[0].entriesTruncated).toBe(5);
  });

  it('truncates oversized string fields and names them', () => {
    const longOutput = 'x'.repeat(MAX_OUTPUT_STRING_LENGTH + 100);

    const result = summarizeActionOutputs({ 'agent-1': { stdout: longOutput } })!;

    const stdout = result.agents[0].stdout as string;
    expect(stdout.length).toBeLessThan(longOutput.length);
    expect(stdout).toContain('100 more characters');
    expect(result.agents[0].truncatedFields).toEqual(['stdout']);
  });

  it('does not flag fields that are within the bound', () => {
    const result = summarizeActionOutputs({ 'agent-1': { stdout: 'short' } })!;

    expect(result.agents[0].stdout).toBe('short');
    expect(result.agents[0].truncatedFields).toBeUndefined();
  });

  describe('nested payloads', () => {
    it('bounds stdout nested under content', () => {
      // The production shape nests the payload one level down
      // (`{ type, content: { stdout } }`), so a top-level-only bound left the
      // multi-MB output unbounded — the bug this covers.
      const longOutput = 'x'.repeat(MAX_OUTPUT_STRING_LENGTH + 100);

      const result = summarizeActionOutputs({
        'agent-1': { type: 'json', content: { stdout: longOutput } },
      })!;

      const content = result.agents[0].content as { stdout: string };
      expect(content.stdout.length).toBeLessThan(longOutput.length);
      expect(content.stdout).toContain('100 more characters');
      expect(result.agents[0].truncatedFields).toEqual(['content.stdout']);
    });

    it('bounds an entries array nested under content', () => {
      const entries = Array.from({ length: MAX_OUTPUT_ENTRIES_PER_AGENT + 5 }, (_, i) => ({
        pid: i,
      }));

      const result = summarizeActionOutputs({ 'agent-1': { content: { entries } } })!;

      const content = result.agents[0].content as { entries: unknown[] };
      expect(content.entries).toHaveLength(MAX_OUTPUT_ENTRIES_PER_AGENT + 1);
      expect(String(content.entries[MAX_OUTPUT_ENTRIES_PER_AGENT])).toContain('5 more items');
      expect(result.agents[0].truncatedFields).toEqual(['content.entries']);
    });

    it('bounds payloads nested deeper than the depth limit', () => {
      let nested: unknown = { stdout: 'x'.repeat(MAX_OUTPUT_STRING_LENGTH + 500) };
      for (let level = 0; level <= MAX_OUTPUT_DEPTH; level++) {
        nested = { [`level${level}`]: nested };
      }

      const result = summarizeActionOutputs({ 'agent-1': { content: nested } })!;

      expect(JSON.stringify(result).length).toBeLessThan(MAX_OUTPUT_STRING_LENGTH * 3);
      expect(result.agents[0].truncatedFields?.length).toBeGreaterThan(0);
    });

    it('leaves small nested payloads unchanged', () => {
      const result = summarizeActionOutputs({
        'agent-1': { type: 'json', content: { code: 'success', entries: [{ pid: 1 }] } },
      })!;

      expect(result.agents[0].content).toEqual({ code: 'success', entries: [{ pid: 1 }] });
      expect(result.agents[0].truncatedFields).toBeUndefined();
    });
  });
});

describe('summarizeActionHosts', () => {
  it('returns undefined when there are no hosts', () => {
    expect(summarizeActionHosts(undefined)).toBeUndefined();
    expect(summarizeActionHosts(null)).toBeUndefined();
  });

  it('keeps the hosts record shape and reports the total', () => {
    expect(summarizeActionHosts({ 'agent-1': { name: 'host-a' } })).toEqual({
      hosts: { 'agent-1': { name: 'host-a' } },
      totalHosts: 1,
    });
  });

  it('caps the hosts of a fan-out action and reports the drop', () => {
    // A batch isolate targets one entry per host; reporting all of them would
    // inject thousands of records into the model context.
    const hosts: Record<string, unknown> = {};
    for (let i = 0; i < MAX_ACTION_HOSTS + 7; i++) {
      hosts[`agent-${i}`] = { name: `host-${i}` };
    }

    const result = summarizeActionHosts(hosts)!;

    expect(Object.keys(result.hosts)).toHaveLength(MAX_ACTION_HOSTS);
    expect(result.totalHosts).toBe(MAX_ACTION_HOSTS + 7);
    expect(result.hostsTruncated).toBe(7);
  });
});

describe('summarizeAgentState', () => {
  it('returns undefined when there is no agent state', () => {
    expect(summarizeAgentState(undefined)).toBeUndefined();
  });

  it('keeps per-agent completion visible for a small fan-out', () => {
    expect(
      summarizeAgentState({
        'agent-1': { isCompleted: true, wasSuccessful: true, wasCanceled: false },
      })
    ).toEqual({
      agentState: { 'agent-1': { isCompleted: true, wasSuccessful: true, wasCanceled: false } },
      totalAgents: 1,
    });
  });

  it('caps per-agent states and reports the drop', () => {
    const agentState: Record<string, unknown> = {};
    for (let i = 0; i < MAX_AGENT_STATE_ENTRIES + 2; i++) {
      agentState[`agent-${i}`] = { isCompleted: true, wasSuccessful: true, wasCanceled: false };
    }

    const result = summarizeAgentState(agentState)!;

    expect(Object.keys(result.agentState)).toHaveLength(MAX_AGENT_STATE_ENTRIES);
    expect(result.totalAgents).toBe(MAX_AGENT_STATE_ENTRIES + 2);
    expect(result.agentsTruncated).toBe(2);
  });

  it('enforces the cumulative serialized budget across retained agent states', () => {
    const agentState: Record<string, unknown> = {};
    for (let i = 0; i < MAX_AGENT_STATE_ENTRIES; i++) {
      agentState[`agent-${i}`] = {
        errors: Array.from({ length: MAX_OUTPUT_ENTRIES_PER_AGENT }, () => 'e'.repeat(5_000)),
      };
    }

    const result = summarizeAgentState(agentState)!;

    // The budget drops whole agents from the tail but always keeps at least
    // one, so the serialized size is bounded by the budget OR one full agent
    // (plus the map-key wrapper around it).
    expect(Object.keys(result.agentState).length).toBeLessThan(MAX_AGENT_STATE_ENTRIES);
    const oneAgentOverhead =
      JSON.stringify(result.agentState).length -
      JSON.stringify(result.agentState[Object.keys(result.agentState)[0]]).length;
    expect(JSON.stringify(result.agentState).length).toBeLessThanOrEqual(
      Math.max(
        MAX_AGENT_STATE_TOTAL_CHARS,
        JSON.stringify(result.agentState['agent-0']).length + oneAgentOverhead
      )
    );
    expect(result.totalAgents).toBe(MAX_AGENT_STATE_ENTRIES);
    expect(result.agentsTruncatedByBudget).toBeGreaterThan(0);
    expect(result.agentsTruncated).toBe(
      MAX_AGENT_STATE_ENTRIES - Object.keys(result.agentState).length
    );
  });

  it('bounds oversized error strings inside a per-agent state', () => {
    const result = summarizeAgentState({
      'agent-1': { isCompleted: false, errors: ['e'.repeat(MAX_OUTPUT_STRING_LENGTH + 50)] },
    })!;

    const state = result.agentState['agent-1'] as { errors: string[] };
    expect(state.errors[0].length).toBeLessThan(MAX_OUTPUT_STRING_LENGTH + 50);
  });
});
