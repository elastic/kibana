/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { PND_INVESTIGATIONS_URL } from '@kbn/pnd-common';
import type { IRouter, Logger, RequestHandler, RequestHandlerContext } from '@kbn/core/server';
import type { PndConfig } from '../../config';
import { registerAcceptProposalRoute } from './accept_proposal';

function createCapturingRouter() {
  const handlers = new Map<string, RequestHandler>();
  const makeBuilder = (p: string) => ({
    addVersion: (_c: unknown, h: RequestHandler) => {
      handlers.set(p, h);
    },
  });
  return {
    versioned: {
      get: jest.fn(),
      post: jest.fn(({ path }: { path: string }) => makeBuilder(path)),
      put: jest.fn(),
      delete: jest.fn(),
    },
    getHandler: (p: string) => {
      const h = handlers.get(p);
      if (!h) throw new Error('No handler for ' + p);
      return h;
    },
  } as unknown as IRouter & { getHandler: (p: string) => RequestHandler };
}
const createLogger = (): jest.Mocked<Logger> =>
  ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as any);

const BASE_CONFIG: PndConfig = {
  enabled: true,
  ui: { useMockData: false },
  conversationShadowWrite: false,
};

// RouteDependencies requires getSpaceId/getWatchProjection even though this
// route only exercises getInvestigationStore/getWorkflowsManagement — unused
// no-ops for this suite, mirroring list_approved_proposals.test.ts's pattern.
const BASE_DEPS = {
  getSpaceId: () => 'default',
  getWatchProjection: () => undefined,
};

const INVESTIGATION_ID = 'inv-1';
const PROPOSAL_ID = 'prop-1';
const PATH = `${PND_INVESTIGATIONS_URL}/{id}/proposals/{proposalId}/accept`;

const createContext = (): RequestHandlerContext =>
  ({
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser: {} } },
    }),
  } as unknown as RequestHandlerContext);

describe('accept proposal route', () => {
  it('persists an approved status via updateProposalStatus when workflows management is unavailable', async () => {
    const router = createCapturingRouter();
    const mockStore = {
      updateProposalStatus: jest.fn().mockResolvedValue({ status: 'approved' }),
      recordDeepWatchOutcome: jest.fn().mockResolvedValue(undefined),
      reconcileInvestigationAfterDecision: jest.fn().mockResolvedValue(undefined),
    };

    registerAcceptProposalRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      config: BASE_CONFIG,
      getWorkflowsManagement: () => undefined,
      getInvestigationStore: () => mockStore as any,
    });

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: PATH,
      params: { id: INVESTIGATION_ID, proposalId: PROPOSAL_ID },
    });

    await router.getHandler(PATH)(createContext(), request, response);

    expect(mockStore.updateProposalStatus).toHaveBeenCalledWith(
      expect.anything(),
      PROPOSAL_ID,
      { status: 'approved' },
      request
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('does not call updateProposalStatus in mock mode', async () => {
    const router = createCapturingRouter();
    const mockStore = {
      updateProposalStatus: jest.fn().mockResolvedValue({ status: 'approved' }),
      recordDeepWatchOutcome: jest.fn().mockResolvedValue(undefined),
      reconcileInvestigationAfterDecision: jest.fn().mockResolvedValue(undefined),
    };

    registerAcceptProposalRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      config: { ...BASE_CONFIG, ui: { useMockData: true } },
      getWorkflowsManagement: () => undefined,
      getInvestigationStore: () => mockStore as any,
    });

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: PATH,
      params: { id: INVESTIGATION_ID, proposalId: PROPOSAL_ID },
    });

    await router.getHandler(PATH)(createContext(), request, response);

    expect(mockStore.updateProposalStatus).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();
  });

  it('still returns ok and warns (does not throw) when updateProposalStatus rejects', async () => {
    const router = createCapturingRouter();
    const logger = createLogger();
    const mockStore = {
      updateProposalStatus: jest.fn().mockRejectedValue(new Error('ES down')),
      recordDeepWatchOutcome: jest.fn().mockResolvedValue(undefined),
      reconcileInvestigationAfterDecision: jest.fn().mockResolvedValue(undefined),
    };

    registerAcceptProposalRoute({
      ...BASE_DEPS,
      router,
      logger,
      config: BASE_CONFIG,
      getWorkflowsManagement: () => undefined,
      getInvestigationStore: () => mockStore as any,
    });

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: PATH,
      params: { id: INVESTIGATION_ID, proposalId: PROPOSAL_ID },
    });

    await router.getHandler(PATH)(createContext(), request, response);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to persist approved status')
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('skips store calls entirely when the store is unavailable', async () => {
    const router = createCapturingRouter();

    registerAcceptProposalRoute({
      ...BASE_DEPS,
      router,
      logger: createLogger(),
      config: BASE_CONFIG,
      getWorkflowsManagement: () => undefined,
      getInvestigationStore: () => undefined,
    });

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: PATH,
      params: { id: INVESTIGATION_ID, proposalId: PROPOSAL_ID },
    });

    await router.getHandler(PATH)(createContext(), request, response);

    expect(response.ok).toHaveBeenCalled();
  });
});
