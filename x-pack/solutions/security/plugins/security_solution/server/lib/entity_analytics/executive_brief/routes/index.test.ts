/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { APP_ID } from '../../../../../common';
import { FIXTURE_JOB_SUCCEEDED } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import {
  EXECUTIVE_BRIEF_POC_GENERATE_URL,
  EXECUTIVE_BRIEF_POC_JOB_URL,
  POC_JOB_TIMEOUT_MS,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { ExecutiveBriefJob } from '../../../../../common/entity_analytics/executive_brief/types';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { registerExecutiveBriefRoutes } from '.';

const mockStore = {
  ensureIndex: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  get: jest.fn(),
};
jest.mock('../job/brief_job_store', () => ({
  ...jest.requireActual('../job/brief_job_store'),
  createBriefJobStore: () => mockStore,
}));

const mockRun = jest.fn();
jest.mock('../job/run_executive_brief', () => ({
  runExecutiveBrief: (args: unknown) => mockRun(args),
}));
jest.mock('../snapshot/glance', () => ({ buildGlance: jest.fn() }));
jest.mock('../snapshot/entities', () => ({ fetchBriefEntities: jest.fn() }), { virtual: true });
jest.mock('../storylines', () => ({ buildStorylines: jest.fn() }), { virtual: true });
jest.mock('../blind_spots', () => ({ buildBlindSpots: jest.fn() }));

const validBody = {
  timeRange: {
    from: '2026-10-01T12:00:00.000Z',
    to: '2026-10-08T12:00:00.000Z',
    range: '7d',
  },
  generator: 'template',
  mode: 'names',
};

describe('executive brief routes', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let username: string | undefined;
  const getConnectorById = jest.fn();
  const getClient = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    username = 'elastic';
    mockRun.mockResolvedValue(undefined);
    mockStore.ensureIndex.mockResolvedValue(undefined);
    mockStore.create.mockResolvedValue(undefined);
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    clients.core.security.authc.getCurrentUser.mockImplementation(() =>
      username ? ({ username } as unknown as AuthenticatedUser) : null
    );
    context = requestContextMock.convertContext(requestContextMock.create({ ...clients }));
    const getStartServices = jest.fn().mockResolvedValue([
      {},
      {
        inference: { getConnectorById, getClient },
        cases: undefined,
        entityStore: {},
        fleet: undefined,
      },
    ]);
    registerExecutiveBriefRoutes({
      router: server.router,
      logger: loggingSystemMock.createLogger(),
      getStartServices,
      ml: undefined,
    } as unknown as EntityAnalyticsRoutesDeps);
  });

  it('declares the entity analytics privileges on both routes', () => {
    [server.router.versioned.post, server.router.versioned.get].forEach((method) => {
      const [routeConfig] = method.mock.calls[0];
      expect(routeConfig.access).toBe('internal');
      const authz = routeConfig.security?.authz as { requiredPrivileges?: unknown } | undefined;
      expect(authz?.requiredPrivileges).toEqual(['securitySolution', `${APP_ID}-entity-analytics`]);
    });
  });

  describe('POST generate', () => {
    beforeEach(() => {
      // The shared server mock dispatches on the first method that has registered calls.
      server.router.versioned.get.mockClear();
    });

    const post = (body: object) =>
      server.inject(
        requestMock.create({ method: 'post', path: EXECUTIVE_BRIEF_POC_GENERATE_URL, body }),
        context
      );

    it('creates a pending job, starts the run in-process and returns 202 { id, status }', async () => {
      const response = await post(validBody);
      expect(response.status).toBe(202);
      expect(response.body).toEqual({ id: expect.any(String), status: 'pending' });

      expect(mockStore.ensureIndex).toHaveBeenCalled();
      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: response.body.id,
          status: 'pending',
          spaceId: 'default',
          createdBy: { username: 'elastic' },
          params: validBody,
        })
      );
      expect(mockRun).toHaveBeenCalledTimes(1);
      const args = mockRun.mock.calls[0][0];
      expect(args.briefId).toBe(response.body.id);
      expect(args.generator.kind).toBe('template');
      expect(args.context.abortSignal).toBeInstanceOf(AbortSignal);
      expect(POC_JOB_TIMEOUT_MS).toBe(300_000);
    });

    it('does not wait for the run to finish', async () => {
      mockRun.mockReturnValue(new Promise(() => {}));
      expect((await post(validBody)).status).toBe(202);
    });

    it('logs, and does not fail the request, when the run cannot record its outcome', async () => {
      mockRun.mockRejectedValue(new Error('es down'));
      expect((await post(validBody)).status).toBe(202);
    });

    it.each([
      ['bad generator', { ...validBody, generator: 'magic' }],
      ['bad mode', { ...validBody, mode: 'x' }],
      ['bad range key', { ...validBody, timeRange: { ...validBody.timeRange, range: '1y' } }],
      ['oversized connector id', { ...validBody, connectorId: 'x'.repeat(257) }],
      [
        'oversized timestamp',
        { ...validBody, timeRange: { ...validBody.timeRange, from: 'x'.repeat(65) } },
      ],
      ['missing timeRange', { generator: 'template', mode: 'names' }],
    ])('rejects %s at schema validation (400)', async (_name, body) => {
      await expect(post(body)).rejects.toThrow('Request was rejected');
      expect(mockStore.create).not.toHaveBeenCalled();
    });

    it('rejects a non-date range with 400', async () => {
      const bad = await post({
        ...validBody,
        timeRange: { ...validBody.timeRange, from: 'yesterday' },
      });
      expect(bad.status).toBe(400);
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('rejects an inverted range with 400', async () => {
      const inverted = await post({
        ...validBody,
        timeRange: {
          ...validBody.timeRange,
          from: validBody.timeRange.to,
          to: validBody.timeRange.from,
        },
      });
      expect(inverted.status).toBe(400);
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('requires a connectorId for the inference generator', async () => {
      expect((await post({ ...validBody, generator: 'inference' })).status).toBe(400);
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('checks the connector synchronously and returns 400 when it cannot be used', async () => {
      getConnectorById.mockRejectedValue(new Error('no such connector'));
      const response = await post({ ...validBody, generator: 'inference', connectorId: 'c1' });
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain('no such connector');
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('binds the inference client to the connector when it resolves', async () => {
      getConnectorById.mockResolvedValue({ connectorId: 'c1' });
      getClient.mockReturnValue({ output: jest.fn() });
      const response = await post({ ...validBody, generator: 'inference', connectorId: 'c1' });
      expect(response.status).toBe(202);
      expect(getClient).toHaveBeenCalledWith(
        expect.objectContaining({ bindTo: { connectorId: 'c1' } })
      );
      expect(mockRun.mock.calls[0][0].generator.kind).toBe('inference');
    });

    it('returns 401 when the user cannot be resolved', async () => {
      username = undefined;
      expect((await post(validBody)).status).toBe(401);
      expect(mockStore.create).not.toHaveBeenCalled();
    });

    it('returns an error, not a 202, when the job cannot be created', async () => {
      mockStore.create.mockRejectedValue(new Error('index write failed'));
      expect((await post(validBody)).status).toBe(500);
      expect(mockRun).not.toHaveBeenCalled();
    });
  });

  describe('GET job', () => {
    beforeEach(() => {
      server.router.versioned.post.mockClear();
    });

    const get = (id = 'fixture-job-1') =>
      server.inject(
        requestMock.create({
          method: 'get',
          path: EXECUTIVE_BRIEF_POC_JOB_URL,
          params: { id },
        }),
        context
      );

    it('returns the job for the user who created it', async () => {
      mockStore.get.mockResolvedValue(FIXTURE_JOB_SUCCEEDED);
      const response = await get();
      expect(response.status).toBe(200);
      expect(response.body).toEqual(FIXTURE_JOB_SUCCEEDED);
    });

    it('returns 404 for an unknown job, another user, or another space', async () => {
      mockStore.get.mockResolvedValue(undefined);
      expect((await get()).status).toBe(404);
      mockStore.get.mockResolvedValue({
        ...FIXTURE_JOB_SUCCEEDED,
        createdBy: { username: 'other' },
      });
      expect((await get()).status).toBe(404);
      mockStore.get.mockResolvedValue({ ...FIXTURE_JOB_SUCCEEDED, spaceId: 'other-space' });
      expect((await get()).status).toBe(404);
    });

    it('reports a long-silent running job as interrupted', async () => {
      const stale: ExecutiveBriefJob = {
        ...FIXTURE_JOB_SUCCEEDED,
        status: 'running',
        updatedAt: '2020-01-01T00:00:00.000Z',
      };
      mockStore.get.mockResolvedValue(stale);
      const response = await get();
      expect(response.body).toMatchObject({ status: 'failed', error: { code: 'interrupted' } });
    });

    it('rejects an oversized id', async () => {
      await expect(get('x'.repeat(65))).rejects.toThrow('Request was rejected');
    });
  });
});
