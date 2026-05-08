/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExitSpanSample } from '../../data_registry/data_registry_types';
import { buildConnectionsFromSpans } from './build_connections_from_spans';

function makeSpan(overrides: Partial<ExitSpanSample> = {}): ExitSpanSample {
  return {
    serviceName: 'service-a',
    spanDestinationServiceResource: 'service-b:8080',
    spanType: 'external',
    spanSubtype: 'http',
    ...overrides,
  };
}

describe('buildConnectionsFromSpans', () => {
  it('returns empty array for empty input', () => {
    expect(buildConnectionsFromSpans([])).toEqual([]);
  });

  it('resolves to service target when destinationService is present', () => {
    const [conn] = buildConnectionsFromSpans([
      makeSpan({
        serviceName: 'frontend',
        spanDestinationServiceResource: 'backend-host:8080',
        destinationService: { serviceName: 'backend' },
      }),
    ]);

    expect(conn.source).toEqual({ 'service.name': 'frontend' });
    expect(conn.target).toEqual({ 'service.name': 'backend' });
  });

  it('resolves to external target when destinationService is absent', () => {
    const [conn] = buildConnectionsFromSpans([
      makeSpan({
        serviceName: 'backend',
        spanDestinationServiceResource: 'postgres:5432',
        spanType: 'db',
        spanSubtype: 'postgresql',
      }),
    ]);

    expect(conn.source).toEqual({ 'service.name': 'backend' });
    expect(conn.target).toEqual({
      'span.destination.service.resource': 'postgres:5432',
      'span.type': 'db',
      'span.subtype': 'postgresql',
    });
  });

  it('deduplicates connections by source + dependency name', () => {
    const connections = buildConnectionsFromSpans([
      makeSpan({ serviceName: 'frontend', spanDestinationServiceResource: 'backend:8080' }),
      makeSpan({ serviceName: 'frontend', spanDestinationServiceResource: 'backend:8080' }),
    ]);

    expect(connections).toHaveLength(1);
  });

  it('keeps connections with different dependencies separate', () => {
    const connections = buildConnectionsFromSpans([
      makeSpan({ serviceName: 'backend', spanDestinationServiceResource: 'postgres:5432' }),
      makeSpan({ serviceName: 'backend', spanDestinationServiceResource: 'redis:6379' }),
    ]);

    expect(connections).toHaveLength(2);
    expect(connections.map((c) => c._dependencyName).sort()).toEqual([
      'postgres:5432',
      'redis:6379',
    ]);
  });

  it('uses raw resource name as _dependencyName even when service.name is resolved', () => {
    const [conn] = buildConnectionsFromSpans([
      makeSpan({
        serviceName: 'frontend',
        spanDestinationServiceResource: 'backend-loadbalancer:443',
        destinationService: { serviceName: 'backend' },
      }),
    ]);

    expect(conn._dependencyName).toBe('backend-loadbalancer:443');
    expect(conn.target).toEqual({ 'service.name': 'backend' });
  });

  it('first span wins when duplicate connections resolve to different targets', () => {
    const connections = buildConnectionsFromSpans([
      makeSpan({
        serviceName: 'frontend',
        spanDestinationServiceResource: 'backend:8080',
        destinationService: { serviceName: 'backend-v1' },
      }),
      makeSpan({
        serviceName: 'frontend',
        spanDestinationServiceResource: 'backend:8080',
        destinationService: { serviceName: 'backend-v2' },
      }),
    ]);

    expect(connections).toHaveLength(1);
    expect(connections[0].target).toEqual({ 'service.name': 'backend-v1' });
  });
});
