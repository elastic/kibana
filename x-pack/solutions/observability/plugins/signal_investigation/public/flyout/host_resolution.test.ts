/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSeed } from '@kbn/investigation-seed';
import { isContextAnalyzer, isHostDependentAnalyzer, resolveHostPlan } from './host_resolution';

const seed = (overrides: Partial<InvestigationSeed> = {}): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout' },
  ...overrides,
});

describe('resolveHostPlan', () => {
  it('marks service_hosts as a context analyzer and metric_change_points as host-dependent', () => {
    expect(isContextAnalyzer('service_hosts')).toBe(true);
    expect(isContextAnalyzer('metric_change_points')).toBe(false);
    expect(isHostDependentAnalyzer('metric_change_points')).toBe(true);
    expect(isHostDependentAnalyzer('log_change_points')).toBe(false);
  });

  it('waits for service_hosts while it is loading for a service seed', () => {
    const plan = resolveHostPlan({
      seed: seed(),
      hasServiceHostsInCatalog: true,
      serviceHostsLoading: true,
    });

    expect(plan.waitingForServiceHosts).toBe(true);
    expect(plan.hosts).toEqual([]);
  });

  it('forwards the hosts returned by service_hosts into the host analysis seed', () => {
    const plan = resolveHostPlan({
      seed: seed(),
      hasServiceHostsInCatalog: true,
      serviceHostsLoading: false,
      serviceHostsResult: {
        leads: [],
        entities: { 'host.name': ['web-1', 'web-2'] },
        status: 'found',
        message: 'Showing 10 of 12 hosts.',
      },
    });

    expect(plan.waitingForServiceHosts).toBe(false);
    expect(plan.hosts).toEqual(['web-1', 'web-2']);
    expect(plan.seedForHostAnalysis.hosts).toEqual(['web-1', 'web-2']);
    expect(plan.seedForHostAnalysis.entities['host.name']).toBe('web-1');
    expect(plan.fallbackMessage).toBe('Showing 10 of 12 hosts.');
  });

  it('falls back to the seed host and notes the fallback when service_hosts is skipped or has no access', () => {
    const plan = resolveHostPlan({
      seed: seed({ entities: { 'service.name': 'checkout', 'host.name': 'web-seed' } }),
      hasServiceHostsInCatalog: true,
      serviceHostsLoading: false,
      serviceHostsResult: {
        leads: [],
        entities: {},
        status: 'no_access',
      },
    });

    expect(plan.waitingForServiceHosts).toBe(false);
    expect(plan.hosts).toEqual(['web-seed']);
    expect(plan.seedForHostAnalysis.hosts).toEqual(['web-seed']);
    expect(plan.fallbackMessage).toBe(
      'Service hosts could not be resolved; checked only web-seed.'
    );
  });

  it('reports no_access when service_hosts is forbidden and the seed has no host', () => {
    const plan = resolveHostPlan({
      seed: seed(),
      hasServiceHostsInCatalog: true,
      serviceHostsLoading: false,
      serviceHostsResult: {
        leads: [],
        entities: {},
        status: 'no_access',
      },
    });

    expect(plan.skippedStatus).toBe('no_access');
  });

  it('starts immediately with the seed host when there is no service name', () => {
    const plan = resolveHostPlan({
      seed: seed({ entities: { 'host.name': 'web-direct' } }),
      hasServiceHostsInCatalog: true,
      serviceHostsLoading: true,
    });

    expect(plan.waitingForServiceHosts).toBe(false);
    expect(plan.hosts).toEqual(['web-direct']);
  });
});
