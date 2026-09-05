/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ApmConnectionStatsEntry } from '../../data_registry/data_registry_types';
import { getImmediateDownstreamDependencies } from './get_immediate_downstream_dependencies';

const request = {} as KibanaRequest;

function createDataRegistry(entries: ApmConnectionStatsEntry[] | undefined) {
  return {
    getData: jest.fn().mockResolvedValue(entries),
  } as unknown as ObservabilityAgentBuilderDataRegistry;
}

describe('getImmediateDownstreamDependencies', () => {
  it('returns empty connections when the provider yields no data', async () => {
    const result = await getImmediateDownstreamDependencies({
      dataRegistry: createDataRegistry(undefined),
      request,
      serviceName: 'checkout',
      startMs: 0,
      endMs: 1,
    });

    expect(result).toEqual({ connections: [] });
  });

  it('maps service entries including agent.name so nodes render agent icons', async () => {
    const result = await getImmediateDownstreamDependencies({
      dataRegistry: createDataRegistry([
        {
          type: 'service',
          serviceName: 'payment',
          agentName: 'go',
          metrics: { latencyUs: 5000, throughputPerMin: 100, errorRate: 0.05 },
        },
      ]),
      request,
      serviceName: 'checkout',
      startMs: 0,
      endMs: 1,
    });

    expect(result.connections).toEqual([
      {
        source: { 'service.name': 'checkout' },
        target: { 'service.name': 'payment', 'agent.name': 'go' },
        metrics: { latencyMs: 5, throughputPerMin: 100, errorRate: 0.05 },
      },
    ]);
  });

  it('omits agent.name when the provider entry has none', async () => {
    const result = await getImmediateDownstreamDependencies({
      dataRegistry: createDataRegistry([
        {
          type: 'service',
          serviceName: 'payment',
          metrics: { latencyUs: null, throughputPerMin: null, errorRate: null },
        },
      ]),
      request,
      serviceName: 'checkout',
      startMs: 0,
      endMs: 1,
    });

    expect(result.connections[0].target).toEqual({ 'service.name': 'payment' });
  });

  it('maps dependency entries to external nodes', async () => {
    const result = await getImmediateDownstreamDependencies({
      dataRegistry: createDataRegistry([
        {
          type: 'dependency',
          dependencyName: 'postgresql',
          spanType: 'db',
          spanSubtype: 'postgresql',
          metrics: { latencyUs: 1000, throughputPerMin: 10, errorRate: 0 },
        },
      ]),
      request,
      serviceName: 'checkout',
      startMs: 0,
      endMs: 1,
    });

    expect(result.connections[0].target).toEqual({
      'span.destination.service.resource': 'postgresql',
      'span.type': 'db',
      'span.subtype': 'postgresql',
    });
  });
});
