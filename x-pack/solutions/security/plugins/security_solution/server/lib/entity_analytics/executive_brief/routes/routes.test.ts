/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { AuthenticatedUser } from '@kbn/core/server';
import { APP_ID } from '../../../../../common';
import {
  BRIEF_RETENTION_MS,
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_API_VERSION,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefDocument,
  GenerateBriefResponse,
} from '../../../../../common/entity_analytics/executive_brief/document';
import {
  requestContextMock,
  requestMock,
  serverMock,
} from '../../../detection_engine/routes/__mocks__';
import type { BriefStore } from '../store/brief_store';
import { getBriefDocId } from '../store/brief_store';
import { BriefStoreConflictError } from '../store/errors';
import { scheduleGenerateBriefTask } from '../tasks/generate_brief_task';
import { deleteBriefRoute } from './delete_brief';
import { generateBriefRoute } from './generate_brief';
import { getBriefRoute } from './get_brief';
import type { ExecutiveBriefRouteDeps } from './route_utils';

jest.mock('../tasks/generate_brief_task', () => ({
  scheduleGenerateBriefTask: jest.fn(),
}));

const scheduleMock = jest.mocked(scheduleGenerateBriefTask);

const user = {
  username: 'alice',
  profile_uid: 'u_alice',
  authentication_realm: { type: 'native', name: 'native1' },
} as unknown as AuthenticatedUser;

const docId = getBriefDocId('u_alice', 'default');

const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

const document = (job: Partial<BriefDocument['job']> = {}): BriefDocument => ({
  schema_version: 1,
  owner: { id: 'u_alice', username: 'alice' },
  space_id: 'default',
  job: { id: 'job-1', status: 'succeeded', started_at: iso(now - 5000), ...job },
  generated_at: iso(now - 1000),
  expires_at: iso(now + BRIEF_RETENTION_MS),
});

const createStore = () => ({
  get: jest.fn().mockResolvedValue(undefined),
  startJob: jest.fn(async ({ jobId }: { jobId: string }) => ({
    docId,
    reused: false,
    job: { id: jobId, status: 'pending', started_at: iso(now), heartbeat_at: iso(now) },
  })),
  countRunning: jest.fn().mockResolvedValue(0),
  failJob: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true),
});

describe('executive brief routes', () => {
  let postServer: ReturnType<typeof serverMock.create>;
  let getServer: ReturnType<typeof serverMock.create>;
  let deleteServer: ReturnType<typeof serverMock.create>;
  let clients: ReturnType<typeof requestContextMock.createTools>['clients'];
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let store: ReturnType<typeof createStore>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let inference: { getConnectorById: jest.Mock; getDefaultConnector: jest.Mock };
  const logger = loggingSystemMock.createLogger();

  // The server mock serves one route per server.
  const register = (overrides: Partial<ExecutiveBriefRouteDeps> = {}) => {
    postServer = serverMock.create();
    getServer = serverMock.create();
    deleteServer = serverMock.create();
    const deps: Omit<ExecutiveBriefRouteDeps, 'router'> = {
      logger,
      getStartServices: jest
        .fn()
        .mockResolvedValue([{}, { taskManager, inference, searchInferenceEndpoints: undefined }]),
      getBriefStore: async () => store as unknown as BriefStore,
      hasEncryptionKey: true,
      ...overrides,
    };
    generateBriefRoute({ ...deps, router: postServer.router });
    getBriefRoute({ ...deps, router: getServer.router });
    deleteBriefRoute({ ...deps, router: deleteServer.router });
  };

  const post = (body: Record<string, unknown> = { range: '7d' }) =>
    postServer.inject(
      requestMock.create({ method: 'post', path: EXECUTIVE_BRIEF_API_PATH, body }),
      context
    );
  /** Calls the POST handler directly; the shared server mock doesn't support 202 responses. */
  const postAccepted = async (
    body: Record<string, unknown> = { range: '7d' }
  ): Promise<GenerateBriefResponse> => {
    const { handler } = postServer.router.versioned.getRoute('post', EXECUTIVE_BRIEF_API_PATH)
      .versions[EXECUTIVE_BRIEF_API_VERSION];
    const responseFactory = httpServerMock.createResponseFactory();
    await handler(
      context,
      requestMock.create({ method: 'post', path: EXECUTIVE_BRIEF_API_PATH, body }),
      responseFactory
    );
    expect(responseFactory.accepted).toHaveBeenCalledTimes(1);
    return responseFactory.accepted.mock.calls[0][0]?.body as GenerateBriefResponse;
  };
  const get = () =>
    getServer.inject(
      requestMock.create({ method: 'get', path: EXECUTIVE_BRIEF_API_PATH }),
      context
    );
  const del = () =>
    deleteServer.inject(
      requestMock.create({ method: 'delete', path: EXECUTIVE_BRIEF_API_PATH }),
      context
    );

  beforeEach(() => {
    jest.clearAllMocks();
    ({ clients } = requestContextMock.createTools());
    clients.core.security.authc.getCurrentUser.mockReturnValue(user);
    context = requestContextMock.convertContext(requestContextMock.create(clients));
    store = createStore();
    taskManager = taskManagerMock.createStart();
    inference = {
      getConnectorById: jest.fn(async (id: string) => ({ connectorId: id, name: id })),
      getDefaultConnector: jest.fn().mockResolvedValue({ connectorId: 'default', name: 'd' }),
    };
    scheduleMock.mockResolvedValue('task-id');
    register();
  });

  it('requires the Entity Analytics privileges on every route', () => {
    const configs = [
      postServer.router.versioned.post.mock.calls[0][0],
      getServer.router.versioned.get.mock.calls[0][0],
      deleteServer.router.versioned.delete.mock.calls[0][0],
    ];
    for (const config of configs) {
      expect(config.access).toBe('internal');
      expect(
        (config.security?.authz as { requiredPrivileges: unknown }).requiredPrivileges
      ).toEqual(['securitySolution', `${APP_ID}-entity-analytics`]);
    }
  });

  describe('POST', () => {
    it('starts a job, schedules the task with absolute times and returns 202', async () => {
      const body = await postAccepted({ range: '24h', connectorId: 'c1' });

      expect(body).toEqual({
        job: { id: expect.any(String), status: 'pending' },
        reused: false,
      });
      expect(store.startJob).toHaveBeenCalledWith({
        owner: { id: 'u_alice', username: 'alice', profileUid: 'u_alice' },
        spaceId: 'default',
        jobId: expect.any(String),
      });
      const [{ params, taskManager: scheduledWith }] = scheduleMock.mock.calls[0];
      expect(scheduledWith).toBe(taskManager);
      expect(params).toEqual({
        docId,
        jobId: body.job.id,
        spaceId: 'default',
        range: '24h',
        from: expect.any(String),
        to: expect.any(String),
        connectorId: 'c1',
      });
      expect(Date.parse(params.to) - Date.parse(params.from)).toBe(24 * 60 * 60 * 1000);
    });

    it('returns the running job without scheduling another', async () => {
      store.get.mockResolvedValue({
        docId,
        document: document({ status: 'running', stage: 'compose', heartbeat_at: iso(Date.now()) }),
        seqNo: 1,
        primaryTerm: 1,
      });

      expect(await postAccepted()).toEqual({
        job: { id: 'job-1', status: 'running', stage: 'compose' },
        reused: true,
      });
      expect(store.startJob).not.toHaveBeenCalled();
      expect(scheduleMock).not.toHaveBeenCalled();
    });

    it('returns 400 no_encryption_key without an encryption key', async () => {
      register({ hasEncryptionKey: false });
      const response = await post();
      expect(response.status).toBe(400);
      expect(response.body.attributes).toEqual({ code: 'no_encryption_key' });
    });

    it('returns 400 when the user has no stable id', async () => {
      clients.core.security.authc.getCurrentUser.mockReturnValue({
        username: 'bob',
      } as unknown as AuthenticatedUser);
      const response = await post();
      expect(response.status).toBe(400);
      expect(response.body.attributes).toEqual({ code: 'no_stable_user' });
    });

    it('returns 400 no_connector when no connector can be resolved', async () => {
      inference.getDefaultConnector.mockResolvedValue(undefined);
      const response = await post();
      expect(response.status).toBe(400);
      expect(response.body.attributes).toEqual({ code: 'no_connector' });
      expect(store.startJob).not.toHaveBeenCalled();
    });

    it('returns 429 when too many briefs are running', async () => {
      store.countRunning.mockResolvedValue(5);
      const response = await post();
      expect(response.status).toBe(429);
      expect(response.body.attributes).toEqual({ code: 'too_many_running' });
      expect(store.startJob).not.toHaveBeenCalled();
    });

    it('returns 403 without an Enterprise licence', async () => {
      clients.licensing.license.hasAtLeast.mockReturnValue(false);
      const response = await post();
      expect(response.status).toBe(403);
    });

    it('returns 409 when the start keeps conflicting', async () => {
      store.startJob.mockRejectedValue(new BriefStoreConflictError('busy'));
      const response = await post();
      expect(response.status).toBe(409);
    });

    it('fails the job when the task cannot be scheduled', async () => {
      scheduleMock.mockRejectedValue(new Error('no api keys'));
      const response = await post();
      expect(response.status).toBe(500);
      expect(store.failJob).toHaveBeenCalledWith(
        expect.objectContaining({
          docId,
          error: expect.objectContaining({ code: 'internal' }),
        })
      );
    });

    it('rejects an invalid range', async () => {
      await expect(post({ range: '1y' })).rejects.toThrow(/rejected/);
    });
  });

  describe('GET', () => {
    it('returns the brief without the owner id', async () => {
      store.get.mockResolvedValue({ docId, document: document(), seqNo: 1, primaryTerm: 1 });

      const response = await get();

      expect(response.status).toBe(200);
      expect(response.body.owner).toEqual({ username: 'alice' });
      expect(response.body.schema_version).toBeUndefined();
      expect(response.body.job.status).toBe('succeeded');
      expect(store.get).toHaveBeenCalledWith({ ownerId: 'u_alice', spaceId: 'default' });
    });

    it('reports a stale running job as interrupted', async () => {
      store.get.mockResolvedValue({
        docId,
        document: document({ status: 'running', heartbeat_at: iso(Date.now() - 120_000) }),
        seqNo: 1,
        primaryTerm: 1,
      });

      const response = await get();

      expect(response.body.job).toEqual(
        expect.objectContaining({
          status: 'failed',
          error: expect.objectContaining({ code: 'interrupted' }),
        })
      );
    });

    it('returns 404 when there is no brief', async () => {
      const response = await get();
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE', () => {
    it('deletes the caller brief in this space', async () => {
      const response = await del();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ deleted: true });
      expect(store.delete).toHaveBeenCalledWith({ ownerId: 'u_alice', spaceId: 'default' });
    });
  });
});
