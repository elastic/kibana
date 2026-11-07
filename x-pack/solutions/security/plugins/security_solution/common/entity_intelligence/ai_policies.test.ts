/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  aiPolicyInputSchema,
  updateAiPolicyRequestSchema,
  aiPolicyDetectorHeartbeatSchema,
} from './ai_policies';
import type { AiPolicyInput, AiPolicyDetectorHeartbeat } from './ai_policies';

const policy: AiPolicyInput = {
  name: 'Protected fixture',
  description: 'Detect a request mentioning the protected fixture.',
  enabled: true,
  mode: 'monitor',
  providers: ['cursor', 'agent_builder'],
  activityType: 'protected_file_access',
  severity: 'high',
  toolNames: [],
  inputContains: 'protected-fixture.txt',
};

const heartbeat: AiPolicyDetectorHeartbeat = {
  collectorId: 'local-monitor',
  runStartedAt: '2026-10-14T12:00:00.000Z',
  runCompletedAt: '2026-10-14T12:00:05.000Z',
  intervalSeconds: 15,
  policiesLoaded: 1,
  sources: [
    { provider: 'cursor', status: 'healthy', observationsScanned: 2, findingsCreated: 1 },
    {
      provider: 'agent_builder',
      status: 'unavailable',
      observationsScanned: 0,
      findingsCreated: 0,
    },
  ],
};

describe('AI policy API schemas', () => {
  it('accepts monitor conditions for tool names, input text, or both', () => {
    expect(aiPolicyInputSchema.parse(policy)).toEqual(policy);
    expect(
      aiPolicyInputSchema.safeParse({ ...policy, toolNames: ['exec_command'], inputContains: '' })
        .success
    ).toBe(true);
    expect(aiPolicyInputSchema.safeParse({ ...policy, toolNames: ['exec_command'] }).success).toBe(
      true
    );
  });

  it.each([
    { mode: 'enforce' },
    { inputContains: '   ', toolNames: [] },
    { providers: [] },
    { providers: ['cursor', 'cursor'] },
    { toolNames: ['exec_command', 'exec_command'] },
    { toolNames: [''] },
    { name: 'x'.repeat(121) },
    { inputContains: 'x'.repeat(501) },
    { toolNames: Array.from({ length: 21 }, (_, index) => `tool-${index}`) },
    { createdBy: 'forged-user' },
    { effectiveFrom: '2020-01-01T00:00:00.000Z' },
    { spaceId: 'another-space' },
  ])('rejects unsafe or unsupported policy input %j', (overrides) => {
    expect(aiPolicyInputSchema.safeParse({ ...policy, ...overrides }).success).toBe(false);
  });

  it('accepts all five providers and their detector coverage together', () => {
    const providers = ['cursor', 'agent_builder', 'codex', 'claude_desktop', 'google_adk'];
    expect(aiPolicyInputSchema.safeParse({ ...policy, providers }).success).toBe(true);
    expect(
      aiPolicyDetectorHeartbeatSchema.safeParse({
        ...heartbeat,
        sources: providers.map((provider) => ({
          provider,
          status: 'unavailable',
          observationsScanned: 0,
          findingsCreated: 0,
        })),
      }).success
    ).toBe(true);
  });

  it('requires a positive expected version on updates', () => {
    expect(updateAiPolicyRequestSchema.safeParse(policy).success).toBe(false);
    expect(updateAiPolicyRequestSchema.safeParse({ ...policy, expectedVersion: 0 }).success).toBe(
      false
    );
    expect(updateAiPolicyRequestSchema.safeParse({ ...policy, expectedVersion: 1 }).success).toBe(
      true
    );
  });

  it('bounds status messages and preserves partial coverage without requiring healthy sources', () => {
    expect(aiPolicyDetectorHeartbeatSchema.parse(heartbeat)).toEqual(heartbeat);
    expect(
      aiPolicyDetectorHeartbeatSchema.safeParse({
        ...heartbeat,
        sources: [{ ...heartbeat.sources[0], message: 'x'.repeat(513) }],
      }).success
    ).toBe(false);
  });

  it('rejects duplicate sources, negative counters, invalid intervals and reversed run times', () => {
    for (const overrides of [
      { sources: [heartbeat.sources[0], heartbeat.sources[0]] },
      { sources: [{ ...heartbeat.sources[0], findingsCreated: -1 }] },
      { intervalSeconds: 601 },
      { runCompletedAt: '2026-10-14T11:00:00.000Z' },
    ]) {
      expect(
        aiPolicyDetectorHeartbeatSchema.safeParse({ ...heartbeat, ...overrides }).success
      ).toBe(false);
    }
  });
});
