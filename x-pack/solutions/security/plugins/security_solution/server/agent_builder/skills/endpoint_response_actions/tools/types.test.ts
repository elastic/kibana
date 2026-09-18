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
  summarizeActionOutputs,
  MAX_OUTPUT_AGENTS,
  MAX_OUTPUT_ENTRIES_PER_AGENT,
  MAX_OUTPUT_STRING_LENGTH,
} from './types';
import { ToolResultType } from '@kbn/agent-builder-common';

describe('response action error helpers', () => {
  it('responseActionErrorResult returns a typed error envelope', () => {
    const result = responseActionErrorResult('action_not_found', 'Action missing');

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual({
      error: 'action_not_found',
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
});
