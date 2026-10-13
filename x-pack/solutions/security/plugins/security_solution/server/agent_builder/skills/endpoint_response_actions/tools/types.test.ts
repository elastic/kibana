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
  GET_RESPONSE_ACTION_STATUS_MAX_RESULT_TOKENS,
  MAX_ACTION_ERRORS,
  MAX_ACTION_HOSTS,
  MAX_AGENT_STATE_ENTRIES,
  MAX_AGENT_STATE_TOTAL_CHARS,
  MAX_OUTPUT_AGENTS,
  MAX_OUTPUT_DEPTH,
  MAX_OUTPUT_ENTRIES_PER_AGENT,
  MAX_OUTPUT_STRING_LENGTH,
  MAX_OUTPUT_TOTAL_CHARS,
  MAX_PARAMETER_KEYS,
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

  it('endpointNotFoundData reports a hostname miss without fabricating host state', () => {
    const data = endpointNotFoundData({ hostName: 'lost-host' });
    expect(data).toEqual({
      kind: 'response_action_result',
      hostName: 'lost-host',
      found: false,
      reason: 'endpoint_not_found',
      message: "No endpoint found with hostname 'lost-host'.",
    });
    // No host was observed, so no status/isolation/last-seen may be reported.
    expect(data).not.toHaveProperty('isolated');
    expect(data).not.toHaveProperty('status');
    expect(data).not.toHaveProperty('lastSeen');
  });

  it('endpointNotFoundData labels an ID-only miss as an agent ID, not a hostname', () => {
    expect(endpointNotFoundData({ agentId: 'agent-404' })).toEqual({
      kind: 'response_action_result',
      agentId: 'agent-404',
      found: false,
      reason: 'endpoint_not_found',
      message: "No endpoint found with agent ID 'agent-404'.",
    });
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

describe('GET_RESPONSE_ACTION_STATUS_MAX_RESULT_TOKENS', () => {
  it('covers the capped sections at 4 characters per token (derivation in the constant JSDoc)', () => {
    const cappedChars =
      MAX_OUTPUT_TOTAL_CHARS +
      MAX_AGENT_STATE_TOTAL_CHARS +
      MAX_PARAMETER_KEYS * MAX_OUTPUT_STRING_LENGTH +
      MAX_ACTION_ERRORS * MAX_OUTPUT_STRING_LENGTH;

    expect(cappedChars).toBe(228_000);
    expect(GET_RESPONSE_ACTION_STATUS_MAX_RESULT_TOKENS * 4).toBeGreaterThan(cappedChars);
  });
});

describe('summarizeActionOutputs', () => {
  it('keeps the first agent summary even when it alone exceeds the total budget', () => {
    const oversized = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`key-${i}`, 'x'.repeat(MAX_OUTPUT_STRING_LENGTH)])
    );
    const result = summarizeActionOutputs({ 'agent-1': oversized })!;
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].agentId).toBe('agent-1');
  });

  it('shrinks an over-budget first agent to fit and names what it shortened', () => {
    const oversized = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`key-${i}`, 'x'.repeat(MAX_OUTPUT_STRING_LENGTH)])
    );

    const result = summarizeActionOutputs({ 'agent-1': oversized })!;

    expect(JSON.stringify(result.agents[0]).length).toBeLessThanOrEqual(MAX_OUTPUT_TOTAL_CHARS);
    expect(result.retainedOverBudget).toBeUndefined();
    expect(result.summaryTruncated).toBeUndefined();
    expect(result.agents[0].truncatedFields).toContain('key-0');
    // The earliest keys survive; the dropped tail is named, not silent.
    expect(result.agents[0]).toHaveProperty('key-0');
    expect(result.agents[0]).not.toHaveProperty('key-49');
    expect(result.agents[0].truncatedFields).toContain('key-49');
  });

  it('fits a first agent whose size comes from nested list entries', () => {
    const entries = Array.from({ length: MAX_OUTPUT_ENTRIES_PER_AGENT }, () =>
      Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`k${i}`, 'x'.repeat(MAX_OUTPUT_STRING_LENGTH)])
      )
    );

    const result = summarizeActionOutputs({ 'agent-1': { content: { entries } } })!;

    expect(JSON.stringify(result.agents[0]).length).toBeLessThanOrEqual(MAX_OUTPUT_TOTAL_CHARS);
    expect(result.retainedOverBudget).toBeUndefined();
    expect(result.agents[0].totalEntries).toBe(MAX_OUTPUT_ENTRIES_PER_AGENT);
    expect(result.agents[0].truncatedFields).toContain('entries');
  });

  it('reduces to a bounded path sample when even the path list is irreducible', () => {
    const entries = Array.from({ length: MAX_OUTPUT_ENTRIES_PER_AGENT }, () =>
      Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`k${i}`, 'x'.repeat(MAX_OUTPUT_STRING_LENGTH)])
      )
    );
    const wideKeys = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`${'w'.repeat(1500)}${i}`, 'x'.repeat(10)])
    );

    const result = summarizeActionOutputs({
      'agent-1': { content: { entries, ...wideKeys }, ...wideKeys },
    })!;

    expect(JSON.stringify(result.agents[0]).length).toBeLessThanOrEqual(MAX_OUTPUT_TOTAL_CHARS);
    expect(result.agents[0].totalEntries).toBe(MAX_OUTPUT_ENTRIES_PER_AGENT);
    expect(result.agents[0].truncatedFields!.length).toBeLessThanOrEqual(20);
  });

  it('does not flag retainedOverBudget when the retained summaries fit the budget', () => {
    const result = summarizeActionOutputs({ 'agent-1': { stdout: 'ok' } })!;

    expect(result.retainedOverBudget).toBeUndefined();
  });

  it('drops trailing agents once the cumulative budget is exceeded and reports summaryTruncated', () => {
    const big = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`key-${i}`, 'x'.repeat(MAX_OUTPUT_STRING_LENGTH)])
    );

    const result = summarizeActionOutputs({ 'agent-1': big, 'agent-2': big, 'agent-3': big })!;

    expect(result.agents.map((agent) => agent.agentId)).toEqual(['agent-1']);
    expect(result.summaryTruncated).toBe(true);
    expect(result.totalAgents).toBe(3);
    expect(result.agentsTruncated).toBe(2);
    expect(result.retainedOverBudget).toBeUndefined();
  });

  it('returns undefined when there are no outputs', () => {
    expect(summarizeActionOutputs(undefined)).toBeUndefined();
    expect(summarizeActionOutputs(null)).toBeUndefined();
  });

  it('passes small outputs through unchanged', () => {
    const result = summarizeActionOutputs({
      'agent-1': { type: 'json', content: { entries: [{ stdout: 'ok' }] } },
    });

    expect(result).toEqual({
      agents: [
        {
          agentId: 'agent-1',
          type: 'json',
          entries: [{ stdout: 'ok' }],
          totalEntries: 1,
        },
      ],
      totalAgents: 1,
    });
  });

  it('caps the number of agents and reports how many were dropped', () => {
    const outputs: Record<string, unknown> = {};
    for (let i = 0; i < MAX_OUTPUT_AGENTS + 3; i++) {
      outputs[`agent-${i}`] = { content: { entries: [] } };
    }

    const result = summarizeActionOutputs(outputs)!;

    expect(result.agents).toHaveLength(MAX_OUTPUT_AGENTS);
    expect(result.totalAgents).toBe(MAX_OUTPUT_AGENTS + 3);
    expect(result.agentsTruncated).toBe(3);
  });

  it('caps entries per agent and reports the dropped count', () => {
    const entries = Array.from({ length: MAX_OUTPUT_ENTRIES_PER_AGENT + 5 }, (_, i) => ({ i }));

    const result = summarizeActionOutputs({ 'agent-1': { content: { entries } } })!;

    expect(result.agents[0].entries).toHaveLength(MAX_OUTPUT_ENTRIES_PER_AGENT);
    expect(result.agents[0].entries).toEqual(entries.slice(0, MAX_OUTPUT_ENTRIES_PER_AGENT));
    expect(result.agents[0].totalEntries).toBe(MAX_OUTPUT_ENTRIES_PER_AGENT + 5);
    expect(result.agents[0].entriesTruncated).toBe(5);
    expect(result.agents[0].truncatedFields).toBeUndefined();
  });

  it('caps get-file contents per agent and reports the dropped count', () => {
    const contents = Array.from({ length: MAX_OUTPUT_ENTRIES_PER_AGENT + 3 }, (_, i) => ({
      path: `/tmp/file-${i}`,
    }));

    const result = summarizeActionOutputs({ 'agent-1': { content: { code: 'ok', contents } } })!;

    expect(result.agents[0].contents).toHaveLength(MAX_OUTPUT_ENTRIES_PER_AGENT);
    expect(result.agents[0].totalContents).toBe(MAX_OUTPUT_ENTRIES_PER_AGENT + 3);
    expect(result.agents[0].contentsTruncated).toBe(3);
    expect(result.agents[0].content).toEqual({ code: 'ok' });
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

      // No marker string is appended into the process list.
      expect(result.agents[0].entries).toHaveLength(MAX_OUTPUT_ENTRIES_PER_AGENT);
      expect(result.agents[0].entries!.every((entry) => typeof entry === 'object')).toBe(true);
      expect(result.agents[0].totalEntries).toBe(MAX_OUTPUT_ENTRIES_PER_AGENT + 5);
      expect(result.agents[0].entriesTruncated).toBe(5);
    });

    it('bounds oversized strings inside kept entries and names the path', () => {
      const result = summarizeActionOutputs({
        'agent-1': {
          content: {
            entries: [{ pid: 1 }, { command: 'x'.repeat(MAX_OUTPUT_STRING_LENGTH + 10) }],
          },
        },
      })!;

      // Named as the model sees it: the list is lifted to the top level of the
      // agent summary, so there is no `content.` prefix.
      expect(result.agents[0].truncatedFields).toEqual(['entries[1].command']);
      expect(result.agents[0]).not.toHaveProperty('content');
      expect(result.agents[0].totalEntries).toBe(2);
    });

    it('serializes values nested deeper than the depth limit instead of walking them', () => {
      // Short leaf: neither the string bound nor the overall size can trigger,
      // so only the depth limit explains the serialized value.
      let nested: unknown = { leaf: 'ok' };
      for (let level = 0; level < MAX_OUTPUT_DEPTH; level++) {
        nested = { [`level${level}`]: nested };
      }

      const result = summarizeActionOutputs({ 'agent-1': { content: nested } })!;

      const content = result.agents[0].content as Record<string, unknown>;
      let cursor: unknown = content;
      for (let level = MAX_OUTPUT_DEPTH - 1; level >= 1; level--) {
        cursor = (cursor as Record<string, unknown>)[`level${level}`];
      }
      expect(typeof (cursor as Record<string, unknown>).level0).toBe('string');
      expect((cursor as Record<string, unknown>).level0).toBe('{"leaf":"ok"}');
      expect(result.agents[0].truncatedFields).toBeUndefined();
    });

    it('serializes an array nested deeper than the depth limit', () => {
      let nested: unknown = [1, 2, 3];
      for (let level = 0; level < MAX_OUTPUT_DEPTH; level++) {
        nested = { [`level${level}`]: nested };
      }

      const result = summarizeActionOutputs({ 'agent-1': { content: nested } })!;

      let cursor = result.agents[0].content as Record<string, unknown>;
      for (let level = MAX_OUTPUT_DEPTH - 1; level >= 1; level--) {
        cursor = cursor[`level${level}`] as Record<string, unknown>;
      }
      expect(cursor.level0).toBe('[1,2,3]');
    });

    it('reports the path of an oversized value found beyond the depth limit', () => {
      let nested: unknown = { stdout: 'x'.repeat(MAX_OUTPUT_STRING_LENGTH + 500) };
      for (let level = 0; level < MAX_OUTPUT_DEPTH; level++) {
        nested = { [`level${level}`]: nested };
      }

      const result = summarizeActionOutputs({ 'agent-1': { content: nested } })!;

      expect(JSON.stringify(result).length).toBeLessThan(MAX_OUTPUT_STRING_LENGTH * 3);
      expect(result.agents[0].truncatedFields).toEqual([
        `content.${Array.from(
          { length: MAX_OUTPUT_DEPTH },
          (_, i) => `level${MAX_OUTPUT_DEPTH - 1 - i}`
        ).join('.')}`,
      ]);
    });

    it('leaves small nested payloads unchanged', () => {
      const result = summarizeActionOutputs({
        'agent-1': { type: 'json', content: { code: 'success', entries: [{ pid: 1 }] } },
      })!;

      expect(result.agents[0].content).toEqual({ code: 'success' });
      expect(result.agents[0].entries).toEqual([{ pid: 1 }]);
      expect(result.agents[0].truncatedFields).toBeUndefined();
    });
  });
});

describe('summarizeActionHosts', () => {
  it('bounds oversized host values like the other summarizers', () => {
    const hugeName = 'h'.repeat(MAX_OUTPUT_STRING_LENGTH + 500);
    const result = summarizeActionHosts({ 'agent-1': { name: hugeName } })!;
    const name = (result.hosts['agent-1'] as { name: string }).name;
    expect(name.length).toBeLessThan(hugeName.length);
  });

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
  it('flags when the single retained agent state still exceeds the total budget', () => {
    const oversized = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`key-${i}`, 'x'.repeat(MAX_OUTPUT_STRING_LENGTH)])
    );
    const result = summarizeAgentState({ 'agent-1': oversized })!;
    expect(Object.keys(result.agentState)).toEqual(['agent-1']);
    expect(result.agentStateRetainedOverBudget).toBe(true);
  });

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
      agentStateTotal: 1,
    });
  });

  it('caps per-agent states and reports the drop', () => {
    const agentState: Record<string, unknown> = {};
    for (let i = 0; i < MAX_AGENT_STATE_ENTRIES + 2; i++) {
      agentState[`agent-${i}`] = { isCompleted: true, wasSuccessful: true, wasCanceled: false };
    }

    const result = summarizeAgentState(agentState)!;

    expect(Object.keys(result.agentState)).toHaveLength(MAX_AGENT_STATE_ENTRIES);
    expect(result.agentStateTotal).toBe(MAX_AGENT_STATE_ENTRIES + 2);
    expect(result.agentStateTruncated).toBe(2);
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
    expect(result.agentStateTotal).toBe(MAX_AGENT_STATE_ENTRIES);
    expect(result.agentStateTruncatedByBudget).toBeGreaterThan(0);
    expect(result.agentStateTruncated).toBe(
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
