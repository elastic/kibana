/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import { registerAlertStatusRoute } from './alert_status_route';
import { registerAlertsRoute } from './alerts_route';
import { registerGetTotalIOBytesRoute } from './get_total_io_bytes_route';
import { registerIOEventsRoute } from './io_events_route';
import { registerProcessEventsRoute } from './process_events_route';

const logger = loggingSystemMock.createLogger() as Logger;
const ruleRegistry = {} as RuleRegistryPluginStartContract;

const getQuerySchema = (registerRoute: (router: IRouter) => void) => {
  const httpService = httpServiceMock.createSetupContract();
  const router = httpService.createRouter();

  registerRoute(router as unknown as IRouter);

  const route = router.versioned.get.mock.results[0].value;
  return route.addVersion.mock.calls[0][0].validate.request.query;
};

const processEventsQuerySchema = getQuerySchema((router) =>
  registerProcessEventsRoute(router, logger, ruleRegistry)
);
const ioEventsQuerySchema = getQuerySchema((router) => registerIOEventsRoute(router, logger));
const totalIOBytesQuerySchema = getQuerySchema((router) =>
  registerGetTotalIOBytesRoute(router, logger)
);
const alertsQuerySchema = getQuerySchema((router) =>
  registerAlertsRoute(router, logger, ruleRegistry)
);
const alertStatusQuerySchema = getQuerySchema((router) =>
  registerAlertStatusRoute(router, logger, ruleRegistry)
);

const sessionQuery = {
  index: 'logs-*',
  sessionEntityId: 'entity-id',
  sessionStartTime: '2026-07-22T00:00:00.000Z',
};

describe('Session View route validation', () => {
  it.each([
    ['process events', processEventsQuerySchema],
    ['IO events', ioEventsQuerySchema],
    ['total IO bytes', totalIOBytesQuerySchema],
  ])('accepts supported CCS index expressions for %s', (_, querySchema) => {
    const maximumIndexExpression = `${'a'.repeat(1000)}:${'b'.repeat(256)}`;

    expect(() =>
      querySchema.validate({ ...sessionQuery, index: maximumIndexExpression })
    ).not.toThrow();
    expect(() =>
      querySchema.validate({ ...sessionQuery, index: `${maximumIndexExpression}x` })
    ).toThrow();
  });

  it.each([
    ['process events', processEventsQuerySchema, sessionQuery],
    ['IO events', ioEventsQuerySchema, sessionQuery],
    [
      'alerts',
      alertsQuerySchema,
      {
        sessionEntityId: sessionQuery.sessionEntityId,
        sessionStartTime: sessionQuery.sessionStartTime,
      },
    ],
  ])('accepts timestamp cursors up to 100 characters for %s', (_, querySchema, query) => {
    expect(() => querySchema.validate({ ...query, cursor: 'a'.repeat(100) })).not.toThrow();
    expect(() => querySchema.validate({ ...query, cursor: 'a'.repeat(101) })).toThrow();
  });

  it('accepts alert identifiers up to 64 characters', () => {
    expect(() =>
      alertsQuerySchema.validate({
        sessionEntityId: sessionQuery.sessionEntityId,
        sessionStartTime: sessionQuery.sessionStartTime,
        investigatedAlertId: 'a'.repeat(64),
      })
    ).not.toThrow();
    expect(() => alertStatusQuerySchema.validate({ alertUuid: 'a'.repeat(65) })).toThrow();
  });
});
