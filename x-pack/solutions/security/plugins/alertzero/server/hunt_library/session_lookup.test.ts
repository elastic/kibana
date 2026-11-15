/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { HUNT_SESSION_TTL_SECONDS } from '../../common/hunt_library_profile_state';
import { readHuntUserKey, resolveHuntSession } from './session_lookup';

const NOW = Date.parse('2026-11-09T12:00:00.000Z');
const EXECUTION = 'a8c1d5f2-3b7e-5f4a-9d10-6e2b8c4a7f13';
const SESSION = '0b7c1a3e-5d2f-4c8a-9e61-3f4b8a7d2c10';

const execution = (overrides: Record<string, unknown> = {}) => ({
  workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
  executedBy: 'u_analyst',
  startedAt: new Date(NOW - 60_000).toISOString(),
  labels: {
    'hunt.kind': 'manual_session',
    'hunt.definition_id': 'rare_lsass_process_access',
    'hunt.definition_version': '1',
    'hunt.session_id': SESSION,
  },
  ...overrides,
});

const resolve = (found: unknown, userKey = 'u_analyst') => {
  const management = { getWorkflowExecution: jest.fn().mockResolvedValue(found) };
  return {
    management,
    result: resolveHuntSession({
      management: management as never,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      sessionExecutionId: EXECUTION,
      userKey,
      now: () => NOW,
    }),
  };
};

describe('resolveHuntSession', () => {
  it('reads the session from the execution the user started', async () => {
    const { management, result } = resolve(execution());

    await expect(result).resolves.toEqual({
      ok: true,
      expiresAt: new Date(NOW - 60_000 + HUNT_SESSION_TTL_SECONDS * 1000),
      claims: {
        spaceId: 'default',
        definitionId: 'rare_lsass_process_access',
        definitionVersion: 1,
        sessionId: SESSION,
        sessionExecutionId: EXECUTION,
      },
    });
    expect(management.getWorkflowExecution).toHaveBeenCalledWith(
      EXECUTION,
      'default',
      expect.anything()
    );
  });

  it('carries the Investigation the session is linked to', async () => {
    const found = execution();
    const { result } = resolve({
      ...found,
      labels: { ...found.labels, 'hunt.investigation_id': 'inv-1' },
    });

    await expect(result).resolves.toMatchObject({
      ok: true,
      claims: { investigationId: 'inv-1' },
    });
  });

  it('does not resolve a session another user started', async () => {
    const { result } = resolve(execution(), 'u_someone_else');

    await expect(result).resolves.toEqual({ ok: false, reason: 'not_owner' });
  });

  it('does not resolve an execution that is missing, in another workflow, or not a session', async () => {
    for (const found of [
      null,
      execution({ workflowId: 'some-other-workflow' }),
      execution({ labels: { 'hunt.kind': 'automated' } }),
      execution({ labels: undefined }),
    ]) {
      await expect(resolve(found).result).resolves.toEqual({ ok: false, reason: 'not_found' });
    }
  });

  it('does not resolve a session missing its identity labels', async () => {
    const found = execution();
    const { result } = resolve({
      ...found,
      labels: { ...found.labels, 'hunt.definition_version': 'x' },
    });

    await expect(result).resolves.toEqual({ ok: false, reason: 'not_found' });
  });

  it('expires a session once its time to live has passed', async () => {
    const { result } = resolve(
      execution({ startedAt: new Date(NOW - HUNT_SESSION_TTL_SECONDS * 1000).toISOString() })
    );

    await expect(result).resolves.toEqual({ ok: false, reason: 'expired' });
  });
});

describe('readHuntUserKey', () => {
  it('prefers the profile uid, then the username', () => {
    expect(readHuntUserKey({ profile_uid: 'u_1', username: 'ana' })).toBe('u_1');
    expect(readHuntUserKey({ username: 'ana' })).toBe('ana');
    expect(readHuntUserKey(null)).toBe('unknown');
  });
});
