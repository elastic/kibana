/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { InvestigationUnavailableError } from '@kbn/nightshift-investigations-plugin/server';
import { alertInvestigationRouteRepository } from './investigation_route';

const request = {} as KibanaRequest;
const alert = {
  'kibana.alert.uuid': 'alert-1',
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Test rule',
  'kibana.alert.rule.rule_type_id': 'test.rule',
  'kibana.alert.rule.category': 'Test category',
  'kibana.alert.rule.consumer': 'alerts',
  'kibana.alert.reason': 'Threshold exceeded',
  'kibana.alert.status': 'active',
  'kibana.alert.start': '2026-09-02T10:00:00.000Z',
  'kibana.alert.flapping': false,
  'kibana.space_ids': ['default'],
};

const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
const dependencies = {
  nightshiftInvestigations: {
    isInvestigationAvailable: jest.fn().mockResolvedValue(true),
    getInvestigationsClient: jest.fn().mockReturnValue({ start }),
  },
  ruleRegistry: {
    getRacClientWithRequest: jest.fn().mockResolvedValue({
      getAuthorizedAlertsIndices: jest.fn().mockResolvedValue(['.alerts-observability.test']),
      get: jest.fn().mockResolvedValue(alert),
    }),
    alerting: { getRulesClientWithRequest: jest.fn().mockResolvedValue({}) },
  },
};

it('starts an investigation from a loaded alert', async () => {
  const { handler } =
    alertInvestigationRouteRepository['POST /internal/observability/alerts/{alertId}/investigate'];

  await expect(
    handler({ request, dependencies, params: { path: { alertId: 'alert-1' } } } as never)
  ).resolves.toEqual({ investigation_id: 'investigation-1' });
  expect(start).toHaveBeenCalledWith({
    subject: { type: 'alert', id: 'alert-1' },
    concurrency_key: 'alert-1',
    context: { alerts: [expect.objectContaining({ id: 'alert-1', rule_id: 'rule-1' })] },
  });
});

it('returns investigation start availability from Nightshift', async () => {
  const { handler } =
    alertInvestigationRouteRepository[
      'GET /internal/observability/alerts/investigation/availability'
    ];

  await expect(handler({ request, dependencies } as never)).resolves.toEqual({ available: true });
});

it('returns not found when the user has no authorized alert indices', async () => {
  const { handler } =
    alertInvestigationRouteRepository['POST /internal/observability/alerts/{alertId}/investigate'];
  const noIndicesDependencies = {
    ...dependencies,
    ruleRegistry: {
      ...dependencies.ruleRegistry,
      getRacClientWithRequest: jest.fn().mockResolvedValue({
        getAuthorizedAlertsIndices: jest.fn().mockResolvedValue([]),
      }),
    },
  };

  await expect(
    handler({
      request,
      dependencies: noIndicesDependencies,
      params: { path: { alertId: 'alert-1' } },
    } as never)
  ).rejects.toMatchObject({ output: { statusCode: 404 } });
});

it('preserves alert lookup failures', async () => {
  const { handler } =
    alertInvestigationRouteRepository['POST /internal/observability/alerts/{alertId}/investigate'];
  const lookupError = new Error('Elasticsearch unavailable');
  const failingDependencies = {
    ...dependencies,
    ruleRegistry: {
      ...dependencies.ruleRegistry,
      getRacClientWithRequest: jest.fn().mockResolvedValue({
        getAuthorizedAlertsIndices: jest.fn().mockResolvedValue(['.alerts-observability.test']),
        get: jest.fn().mockRejectedValue(lookupError),
      }),
    },
  };

  await expect(
    handler({
      request,
      dependencies: failingDependencies,
      params: { path: { alertId: 'alert-1' } },
    } as never)
  ).rejects.toBe(lookupError);
});

it('returns service unavailable when investigation start is unavailable', async () => {
  const { handler } =
    alertInvestigationRouteRepository['POST /internal/observability/alerts/{alertId}/investigate'];
  const unavailableDependencies = {
    ...dependencies,
    nightshiftInvestigations: {
      ...dependencies.nightshiftInvestigations,
      getInvestigationsClient: jest.fn().mockReturnValue({
        start: jest.fn().mockRejectedValue(new InvestigationUnavailableError('Unavailable')),
      }),
    },
  };

  await expect(
    handler({
      request,
      dependencies: unavailableDependencies,
      params: { path: { alertId: 'alert-1' } },
    } as never)
  ).rejects.toMatchObject({ output: { statusCode: 503 } });
});
