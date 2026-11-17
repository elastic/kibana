/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ApiPrivileges } from '@kbn/core-security-server';
import type { RouteDependencies } from '../register_routes';
import { HuntPreserveError } from '../../hunt_library/preserve';
import { HuntEvidenceRejectedError } from '../../hunt_library/evidence';
import { HuntSessionStoreError } from '../../hunt_library/session_attachment_store';
import { registerHuntPreserveRoute } from './preserve_route';

const mockPreserve = jest.fn();
jest.mock('../../hunt_library/preserve', () => ({
  ...jest.requireActual('../../hunt_library/preserve'),
  preserveHuntEvidence: (...args: unknown[]) => mockPreserve(...args),
}));

const mockResolve = jest.fn();
jest.mock('../../hunt_library/session_lookup', () => ({
  ...jest.requireActual('../../hunt_library/session_lookup'),
  resolveHuntSession: (...args: unknown[]) => mockResolve(...args),
}));

const SESSION = '0b7c1a3e-5d2f-4c8a-9e61-3f4b8a7d2c10';
const PRESERVATION = '11111111-1111-4111-8111-111111111111';
const claims = {
  spaceId: 'default',
  definitionId: 'okta_failed_oauth_public_client_scope',
  definitionVersion: 1,
  sessionId: SESSION,
  sessionExecutionId: 'a8c1d5f2-3b7e-5f4a-9d10-6e2b8c4a7f13',
};

const makeDeps = ({
  spaceId = 'default',
  management = {} as unknown | null,
}: {
  spaceId?: string;
  management?: unknown;
} = {}) => {
  const post = jest.fn();
  const addVersion = jest.fn();
  post.mockReturnValue({ addVersion });
  const reportTelemetryEvent = jest.fn();
  registerHuntPreserveRoute({
    router: { versioned: { post } } as unknown as RouteDependencies['router'],
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => spaceId,
    getWorkflowsManagement: () => management ?? undefined,
    getAgentBuilderConversations: () => ({ getScopedClient: async () => ({ conv: true }) }),
    getAgentBuilderAttachments: () => ({ getScopedClient: async () => ({ att: true }) }),
    reportTelemetryEvent,
  } as unknown as RouteDependencies);

  const context = {
    alertzero: Promise.resolve({
      subscription: 'available',
      hasRequiredDependencies: true,
      isSpaceSupported: true,
    }),
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser: { es: true } } },
      uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } },
      security: { authc: { getCurrentUser: () => ({ username: 'analyst' }) } },
    }),
  };
  return {
    route: post.mock.calls[0][0],
    handler: addVersion.mock.calls[0][1],
    validate: addVersion.mock.calls[0][0].validate,
    context,
    reportTelemetryEvent,
  };
};

const EXPIRES_AT = new Date('2026-11-09T12:00:00.000Z');
const resolves = (overrides: Partial<typeof claims> & { investigationId?: string } = {}) =>
  mockResolve.mockResolvedValue({
    ok: true,
    claims: { ...claims, ...overrides },
    expiresAt: EXPIRES_AT,
  });

const body = (overrides: Record<string, unknown> = {}) => ({
  token: claims.sessionExecutionId,
  preservation_id: PRESERVATION,
  query: 'FROM logs-okta',
  filters: [],
  time_range: { from: 'now-7d', to: 'now' },
  columns: ['@timestamp'],
  data_view_id: 'dv-1',
  rows: [{ kind: 'raw_event', index: 'logs-okta', id: 'e1' }],
  ...overrides,
});

const call = async (deps: ReturnType<typeof makeDeps>, requestBody = body()) => {
  const response = httpServerMock.createResponseFactory();
  await deps.handler(
    deps.context,
    httpServerMock.createKibanaRequest({ body: requestBody }),
    response
  );
  return response;
};

describe('hunt preserve route', () => {
  beforeEach(() => {
    mockPreserve.mockReset();
    mockResolve.mockReset();
    resolves();
  });

  it('is internal and needs AlertZero Read and manage_investigations', () => {
    const { route } = makeDeps();

    expect(route.access).toBe('internal');
    expect(route.security.authz.requiredPrivileges).toEqual([
      'alertzero_read',
      ApiPrivileges.manage('investigations'),
    ]);
  });

  describe('request validation', () => {
    it('accepts a bounded body and rejects a client-supplied space id or extra fields', () => {
      const { validate } = makeDeps();
      const schema = validate.request.body;

      expect(() => schema.validate(body())).not.toThrow();
      expect(() => schema.validate(body({ space_id: 'other' }))).toThrow();
    });

    it('accepts an optional note', () => {
      const { validate } = makeDeps();

      expect(() => validate.request.body.validate(body({ note: 'Same rare port' }))).not.toThrow();
    });

    it.each([
      ['no rows', { rows: [] }],
      [
        'more than 50 rows',
        { rows: Array.from({ length: 51 }, () => ({ kind: 'aggregate', values: {} })) },
      ],
      ['a non-UUID preservation id', { preservation_id: 'nope' }],
      ['an oversized session id', { token: 'a'.repeat(65) }],
      ['too many columns', { columns: Array.from({ length: 31 }, (_, i) => `c${i}`) }],
      ['too many filters', { filters: Array.from({ length: 51 }, () => ({})) }],
      ['an unknown row kind', { rows: [{ kind: 'other' }] }],
      ['an oversized query', { query: 'x'.repeat(20_001) }],
      ['an oversized note', { note: 'x'.repeat(2001) }],
    ])('rejects %s', (_label, change) => {
      const { validate } = makeDeps();

      expect(() => validate.request.body.validate(body(change))).toThrow();
    });
  });

  it('preserves and returns the Investigation and evidence counts', async () => {
    mockPreserve.mockResolvedValue({
      investigationId: 'inv-1',
      evidenceCount: 3,
      addedCount: 1,
      created: true,
      isRetry: false,
      hadPriorEvidence: false,
    });
    const deps = makeDeps();

    const response = await call(deps);

    const { body: ok } = response.ok.mock.calls[0][0] as {
      body: { profile_token: string } & Record<string, unknown>;
    };
    expect(ok).toMatchObject({
      investigation_id: 'inv-1',
      evidence_count: 3,
      added_count: 1,
      created: true,
    });
    expect(ok.profile_token).toBe(claims.sessionExecutionId);
    expect(mockPreserve).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'analyst',
        preservationId: PRESERVATION,
        claims: expect.objectContaining({ sessionId: SESSION, spaceId: 'default' }),
        selection: [{ kind: 'raw_event', index: 'logs-okta', id: 'e1' }],
        context: expect.objectContaining({ dataViewId: 'dv-1' }),
      })
    );
  });

  it('reports the Investigation and first preservation with only the hunt id and counts', async () => {
    mockPreserve.mockResolvedValue({
      investigationId: 'inv-1',
      evidenceCount: 3,
      addedCount: 3,
      created: true,
      isRetry: false,
      hadPriorEvidence: false,
    });
    const deps = makeDeps();

    await call(deps);

    expect(deps.reportTelemetryEvent.mock.calls).toEqual([
      [
        'alertzero_hunt_investigation_created',
        { hunt_id: 'okta_failed_oauth_public_client_scope', trigger: 'manual' },
      ],
      [
        'alertzero_hunt_session_preserved',
        { hunt_id: 'okta_failed_oauth_public_client_scope', added_count: 3, evidence_count: 3 },
      ],
    ]);
  });

  it('reports nothing when the preservation fails', async () => {
    mockPreserve.mockRejectedValue(new HuntPreserveError('handoff_failed', 'no'));
    const deps = makeDeps();

    await call(deps);

    expect(deps.reportTelemetryEvent).not.toHaveBeenCalled();
  });

  it.each(['not_found', 'not_owner', 'expired'])(
    'rejects a session that resolves as %s before doing anything',
    async (reason) => {
      mockResolve.mockResolvedValue({ ok: false, reason });
      const deps = makeDeps();

      const response = await call(deps);

      expect(response.badRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ attributes: { reason } }) })
      );
      expect(mockPreserve).not.toHaveBeenCalled();
    }
  );

  it('looks the session up in the request space for the calling user', async () => {
    const deps = makeDeps({ spaceId: 'other' });

    await call(deps);

    expect(mockResolve).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'other',
        sessionExecutionId: claims.sessionExecutionId,
        userKey: 'analyst',
      })
    );
  });

  it('returns a generic 500 when the session lookup fails', async () => {
    mockResolve.mockRejectedValue(new Error('secret detail'));
    const deps = makeDeps();

    const response = await call(deps);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to resolve the Hunt session' },
    });
    expect(mockPreserve).not.toHaveBeenCalled();
  });

  it('refuses a session for a hunt that changed', async () => {
    resolves({ definitionVersion: 99 });
    const deps = makeDeps();

    const response = await call(deps, body());

    expect(response.conflict).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ attributes: { reason: 'definition_changed' } }),
      })
    );
    expect(mockPreserve).not.toHaveBeenCalled();
  });

  it('returns 503 when Workflows management is not available', async () => {
    for (const deps of [makeDeps({ management: null })]) {
      const response = await call(deps);
      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
    }
  });

  it.each([
    [
      'rejected evidence',
      new HuntEvidenceRejectedError('document_unavailable', 'gone'),
      422,
      'document_unavailable',
    ],
    ['an oversized session', new HuntSessionStoreError('too_large'), 422, 'too_large'],
    ['a write conflict', new HuntSessionStoreError('write_conflict'), 409, 'write_conflict'],
    [
      'a preservation in progress',
      new HuntPreserveError('preservation_in_progress', 'wait'),
      409,
      'preservation_in_progress',
    ],
    [
      'an inaccessible Investigation',
      new HuntPreserveError('investigation_inaccessible', 'no'),
      403,
      'investigation_inaccessible',
    ],
    [
      'a definition mismatch',
      new HuntPreserveError('definition_mismatch', 'no'),
      403,
      'definition_mismatch',
    ],
    ['a failed handoff', new HuntPreserveError('handoff_failed', 'failed'), 500, 'handoff_failed'],
  ])('maps %s to its status', async (_label, error, statusCode, reason) => {
    mockPreserve.mockRejectedValue(error);
    const deps = makeDeps();

    const response = await call(deps);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode,
      body: { message: error.message, attributes: { reason } },
    });
  });

  it('returns a generic 500 for an unexpected failure without leaking it', async () => {
    mockPreserve.mockRejectedValue(new Error('secret detail'));
    const deps = makeDeps();

    const response = await call(deps);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to preserve Hunt evidence' },
    });
  });
});
