/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import {
  ALERTZERO_WORKER_ATTACH_RULES_URL_TEMPLATE,
  AttachAlertTriageRulesRequestBody,
  AttachAlertTriageRulesRequestParams,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';
import type { WorkersService } from '../../services/workers/workers_service';
import { createRouteContextMock } from '../route_context.mock';
import { registerAttachAlertTriageRulesRoute } from './attach_alert_triage_rules';

const SPACE = 'space-a';
const WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;

const requestFor = (body: Record<string, unknown>, workerId: string = WORKER_ID) =>
  httpServerMock.createKibanaRequest({ params: { workerId }, body });

const setup = () => {
  const router = httpServiceMock.createRouter();
  const attachRulesToAlertTriageWorker = jest.fn();
  const logger = loggerMock.create();
  registerAttachAlertTriageRulesRoute({
    router,
    logger,
    getSpaceId: () => SPACE,
    getWorkersService: () => ({ attachRulesToAlertTriageWorker } as unknown as WorkersService),
  } as never);
  const route = router.versioned.getRoute('post', ALERTZERO_WORKER_ATTACH_RULES_URL_TEMPLATE);
  const [{ handler }] = Object.values(route.versions);
  return { route, handler, attachRulesToAlertTriageWorker, logger };
};

describe('POST attach rules to a Worker', () => {
  it('is authorized on rule write access, which a rule creator holds', () => {
    expect(setup().route.config.security?.authz).toEqual({ requiredPrivileges: [RULES_API_ALL] });
  });

  // Only Alert Triage runs through a per-rule action; the URL names the Worker so it matches the
  // other Worker routes, and a Worker that cannot take rules must say so instead of answering
  // "attached" for something it will never run.
  describe('which Worker the id names', () => {
    it('answers 400 for a known Worker that does not attach to rules, without touching rules', async () => {
      const { handler, attachRulesToAlertTriageWorker } = setup();
      const response = httpServerMock.createResponseFactory();

      await handler(
        createRouteContextMock(),
        requestFor({ ruleIds: ['r1'] }, SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID),
        response
      );

      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID),
        },
      });
      expect(attachRulesToAlertTriageWorker).not.toHaveBeenCalled();
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('answers 404 for an id that is not a Worker, without touching rules', async () => {
      const { handler, attachRulesToAlertTriageWorker } = setup();
      const response = httpServerMock.createResponseFactory();

      await handler(
        createRouteContextMock(),
        requestFor({ ruleIds: ['r1'] }, 'not-a-worker'),
        response
      );

      expect(response.notFound).toHaveBeenCalledTimes(1);
      expect(attachRulesToAlertTriageWorker).not.toHaveBeenCalled();
    });

    it('checks the Worker before AlertZero availability, so a wrong id is never a 200', async () => {
      const { handler } = setup();
      const response = httpServerMock.createResponseFactory();

      await handler(
        createRouteContextMock({ settingEnabled: false }),
        requestFor({ ruleIds: ['r1'] }, 'not-a-worker'),
        response
      );

      expect(response.notFound).toHaveBeenCalledTimes(1);
      expect(response.ok).not.toHaveBeenCalled();
    });
  });

  it("hands the body, the request's space and the request to the service and returns its outcome", async () => {
    const { handler, attachRulesToAlertTriageWorker } = setup();
    const body = { ruleIds: ['r1', 'r2'] };
    attachRulesToAlertTriageWorker.mockResolvedValue({
      outcome: 'attached',
      matched: 2,
      updated: 2,
    });
    const request = requestFor(body);
    const response = httpServerMock.createResponseFactory();

    await handler(createRouteContextMock(), request, response);

    expect(attachRulesToAlertTriageWorker).toHaveBeenCalledWith(body, SPACE, request);
    expect(response.ok).toHaveBeenCalledWith({
      body: { outcome: 'attached', matched: 2, updated: 2 },
    });
  });

  it.each(['worker_disabled', 'worker_unavailable'] as const)(
    'returns the %s outcome as a 200, not an error',
    async (outcome) => {
      const { handler, attachRulesToAlertTriageWorker } = setup();
      attachRulesToAlertTriageWorker.mockResolvedValue({ outcome });
      const response = httpServerMock.createResponseFactory();

      await handler(createRouteContextMock(), requestFor({ ruleIds: ['r1'] }), response);

      expect(response.ok).toHaveBeenCalledWith({ body: { outcome } });
      expect(response.customError).not.toHaveBeenCalled();
    }
  );

  // This gate decides whether rules get attached while AlertZero is off, so each condition that
  // makes it unusable is tested here, next to the code, as well as in the route gate coverage test.
  describe('availability gate', () => {
    it.each([
      { name: 'the AlertZero space setting is off', context: { settingEnabled: false } },
      { name: 'the license is not enough', context: { subscription: 'license' as const } },
      {
        name: 'the serverless tier is not enough',
        context: { subscription: 'serverless_tier' as const },
      },
      { name: 'the subscription is still loading', context: { subscription: 'loading' as const } },
      { name: 'required dependencies are missing', context: { hasRequiredDependencies: false } },
    ])('reports worker_unavailable without attaching when $name', async ({ context }) => {
      const { handler, attachRulesToAlertTriageWorker } = setup();
      const response = httpServerMock.createResponseFactory();

      await handler(createRouteContextMock(context), requestFor({ ruleIds: ['r1'] }), response);

      expect(response.ok).toHaveBeenCalledWith({ body: { outcome: 'worker_unavailable' } });
      expect(attachRulesToAlertTriageWorker).not.toHaveBeenCalled();
    });

    it('calls the service when everything is available', async () => {
      const { handler, attachRulesToAlertTriageWorker } = setup();
      attachRulesToAlertTriageWorker.mockResolvedValue({ outcome: 'worker_disabled' });

      await handler(
        createRouteContextMock({
          settingEnabled: true,
          subscription: 'available',
          hasRequiredDependencies: true,
        }),
        requestFor({ ruleIds: ['r1'] }),
        httpServerMock.createResponseFactory()
      );

      expect(attachRulesToAlertTriageWorker).toHaveBeenCalledTimes(1);
    });
  });

  // A failed attach must reach the workflow as a failed step, not as "nothing to do".
  it('answers 500 and logs when the service throws', async () => {
    const { handler, attachRulesToAlertTriageWorker, logger } = setup();
    attachRulesToAlertTriageWorker.mockRejectedValue(new Error('bulk edit failed'));
    const response = httpServerMock.createResponseFactory();

    await handler(createRouteContextMock(), requestFor({ ruleIds: ['r1'] }), response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(response.ok).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('bulk edit failed'));
  });

  // The route validates its body with this schema, so it is the request contract.
  describe('request validation', () => {
    const isValid = (body: unknown) => AttachAlertTriageRulesRequestBody.safeParse(body).success;

    it.each([
      { name: 'a Worker id', params: { workerId: WORKER_ID }, valid: true },
      { name: 'an empty Worker id', params: { workerId: '' }, valid: false },
      { name: 'a 129-character Worker id', params: { workerId: 'w'.repeat(129) }, valid: false },
      { name: 'no Worker id', params: {}, valid: false },
    ])('treats $name in the path as valid: $valid', ({ params, valid }) => {
      expect(AttachAlertTriageRulesRequestParams.safeParse(params).success).toBe(valid);
    });

    it('accepts a list of rule ids', () => {
      expect(isValid({ ruleIds: ['r1'] })).toBe(true);
    });

    it('accepts up to 2,000 ids and rejects more, so a bigger event chunk fails loudly', () => {
      const ids = (n: number) => Array.from({ length: n }, (_, i) => `r${i}`);
      expect(isValid({ ruleIds: ids(2000) })).toBe(true);
      expect(isValid({ ruleIds: ids(2001) })).toBe(false);
    });

    it.each([
      { name: 'an empty id list', body: { ruleIds: [] } },
      { name: 'no ids', body: {} },
      { name: 'an unknown field', body: { ruleIds: ['r1'], target: 'ids' } },
      { name: 'a 513-character id', body: { ruleIds: ['x'.repeat(513)] } },
    ])('rejects $name', ({ body }) => {
      expect(isValid(body)).toBe(false);
    });
  });
});
