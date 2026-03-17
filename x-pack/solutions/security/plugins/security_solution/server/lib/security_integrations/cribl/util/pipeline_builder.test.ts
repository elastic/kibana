/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildPipelineRequest } from './pipeline_builder';
import type { RouteEntry } from '../../../../../common/security_integrations/cribl/types';

describe('Put cribl routing pipeline tests', () => {
  const routeEntries = [
    { dataId: 'criblSource1', datastream: 'logs-destination1.cloud' },
    { dataId: 'criblSource2', datastream: 'logs-destination2' },
  ] as RouteEntry[];

  it('creates reroute processors for route entries', () => {
    const req = buildPipelineRequest(routeEntries);
    expect(routeEntries.length).toEqual(req.processors?.length);

    req.processors?.forEach(function (processor, i) {
      expect(routeEntries[i].datastream).toContain(processor.reroute?.dataset);
      expect(processor.reroute?.if).toContain(routeEntries[i].dataId);
    });
  });

  it('defaults namespace to "default" when namespace is undefined', () => {
    const req = buildPipelineRequest(routeEntries);

    req.processors?.forEach(function (processor) {
      expect(processor.reroute?.namespace).toEqual(['default']);
    });
  });

  it('defaults namespace to "default" when namespace is empty string', () => {
    const entriesWithEmptyNamespace: RouteEntry[] = [
      { dataId: 'criblSource1', datastream: 'logs-destination1.cloud', namespace: '' },
    ];
    const req = buildPipelineRequest(entriesWithEmptyNamespace);

    expect(req.processors?.[0].reroute?.namespace).toEqual(['default']);
  });

  it('uses custom namespace when provided', () => {
    const entriesWithNamespace: RouteEntry[] = [
      { dataId: 'criblSource1', datastream: 'logs-destination1.cloud', namespace: 'production' },
      { dataId: 'criblSource2', datastream: 'logs-destination2', namespace: 'staging' },
    ];
    const req = buildPipelineRequest(entriesWithNamespace);

    expect(req.processors?.[0].reroute?.namespace).toEqual(['production']);
    expect(req.processors?.[1].reroute?.namespace).toEqual(['staging']);
  });

  it('mixes custom and default namespaces', () => {
    const mixedEntries: RouteEntry[] = [
      { dataId: 'criblSource1', datastream: 'logs-destination1.cloud', namespace: 'custom' },
      { dataId: 'criblSource2', datastream: 'logs-destination2' },
    ];
    const req = buildPipelineRequest(mixedEntries);

    expect(req.processors?.[0].reroute?.namespace).toEqual(['custom']);
    expect(req.processors?.[1].reroute?.namespace).toEqual(['default']);
  });
});
