/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { haltEmulationRoute } from './route';
import { serverMock } from '../../../detection_engine/routes/__mocks__/server';
import { requestContextMock } from '../../../detection_engine/routes/__mocks__/request_context';
import { requestMock } from '../../../detection_engine/routes/__mocks__/request';
import { DETECTION_ENGINE_EMULATION_HALT_URL } from '../../../../../common/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import {
  EmulationConcurrencyGate,
  createDefaultConcurrencyGateConfig,
} from '../../execution/concurrency_gate';

const stubAuthenticatedUser = (
  context: ReturnType<typeof requestContextMock.createTools>['context'],
  username = 'test-user'
) => {
  (context.core.security.authc.getCurrentUser as jest.Mock).mockReturnValue({ username });
};

describe('haltEmulationRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    server = serverMock.create();
  });

  describe('authn', () => {
    it('returns 401 when no authenticated user is attached to the request', async () => {
      const gate = new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), logger);
      haltEmulationRoute(server.router, logger, { concurrencyGate: gate });

      const { context } = requestContextMock.createTools();
      // intentionally do NOT stub the user
      (context.core.security.authc.getCurrentUser as jest.Mock).mockReturnValue(null);

      const response = await server.inject(
        requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_EMULATION_HALT_URL,
          body: {},
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toBe(401);
      expect((response.body as { message: string }).message).toMatch(/Authentication is required/);
    });
  });

  describe('authz', () => {
    it('returns 403 when caller lacks canWriteExecuteOperations', async () => {
      const gate = new EmulationConcurrencyGate(
        { maxConcurrent: 5, staleMs: 60_000, disabled: false },
        logger
      );
      gate.acquire('default', 'scenario-A');

      haltEmulationRoute(server.router, logger, { concurrencyGate: gate });

      const { context } = requestContextMock.createTools();
      stubAuthenticatedUser(context);
      context.securitySolution.getEndpointAuthz.mockResolvedValue(
        getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: false })
      );

      const response = await server.inject(
        requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_EMULATION_HALT_URL,
          body: {},
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toBe(403);
      expect((response.body as { message: string }).message).toMatch(/canWriteExecuteOperations/);
      // The 403 path MUST NOT cancel anything — operator can't even halt without authority.
      expect(gate.getInflightCount('default')).toBe(1);
    });
  });

  describe('happy path', () => {
    it('cancels in-flight slots for the caller current space and returns count', async () => {
      const gate = new EmulationConcurrencyGate(
        { maxConcurrent: 5, staleMs: 60_000, disabled: false },
        logger
      );
      gate.acquire('default', 'scenario-A');
      gate.acquire('default', 'scenario-B');
      gate.acquire('other-space', 'scenario-C');

      haltEmulationRoute(server.router, logger, { concurrencyGate: gate });

      const { context } = requestContextMock.createTools();
      stubAuthenticatedUser(context, 'soc-operator');
      context.securitySolution.getEndpointAuthz.mockResolvedValue(
        getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: true })
      );
      context.securitySolution.getSpaceId.mockReturnValue('default');

      const response = await server.inject(
        requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_EMULATION_HALT_URL,
          body: {},
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ cancelled: 2, spaceId: 'default' });
      expect(gate.getInflightCount('default')).toBe(0);
      expect(gate.getInflightCount('other-space')).toBe(1); // untouched

      // Halt is logged at info-level with operator attribution.
      const infoLines = logger.info.mock.calls.map((c) => String(c[0]));
      expect(
        infoLines.some(
          (l) =>
            l.includes('soc-operator') &&
            l.includes('halted 2 in-flight') &&
            l.includes('[default]')
        )
      ).toBe(true);
    });

    it('honours an explicit spaceId from the request body', async () => {
      const gate = new EmulationConcurrencyGate(
        { maxConcurrent: 5, staleMs: 60_000, disabled: false },
        logger
      );
      gate.acquire('default', 'scenario-A');
      gate.acquire('staging', 'scenario-B');

      haltEmulationRoute(server.router, logger, { concurrencyGate: gate });

      const { context } = requestContextMock.createTools();
      stubAuthenticatedUser(context, 'soc-operator');
      context.securitySolution.getEndpointAuthz.mockResolvedValue(
        getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: true })
      );
      context.securitySolution.getSpaceId.mockReturnValue('default');

      const response = await server.inject(
        requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_EMULATION_HALT_URL,
          body: { spaceId: 'staging' },
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ cancelled: 1, spaceId: 'staging' });
      expect(gate.getInflightCount('default')).toBe(1); // not the override target
      expect(gate.getInflightCount('staging')).toBe(0); // halted
    });

    it('returns cancelled=0 when the space has no in-flight reservations', async () => {
      const gate = new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), logger);
      haltEmulationRoute(server.router, logger, { concurrencyGate: gate });

      const { context } = requestContextMock.createTools();
      stubAuthenticatedUser(context, 'soc-operator');
      context.securitySolution.getEndpointAuthz.mockResolvedValue(
        getEndpointAuthzInitialStateMock({ canWriteExecuteOperations: true })
      );
      context.securitySolution.getSpaceId.mockReturnValue('default');

      const response = await server.inject(
        requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_EMULATION_HALT_URL,
          body: {},
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ cancelled: 0, spaceId: 'default' });
    });
  });

  describe('defensive wiring', () => {
    it('returns 500 when registered without a concurrencyGate (incomplete DI)', async () => {
      // Production wiring always supplies the gate via the shared
      // guardrail bundle. Reaching this branch is a programmer error —
      // fail loud rather than silently report 0 cancelled.
      haltEmulationRoute(server.router, logger);

      const { context } = requestContextMock.createTools();

      const response = await server.inject(
        requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_EMULATION_HALT_URL,
          body: {},
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toBe(500);
      expect((response.body as { message: string }).message).toMatch(
        /concurrency gate is not wired/i
      );
      // The error is logged for ops triage.
      expect(
        logger.error.mock.calls.some((c) => String(c[0]).includes('guardrail wiring is incomplete'))
      ).toBe(true);
    });
  });
});
