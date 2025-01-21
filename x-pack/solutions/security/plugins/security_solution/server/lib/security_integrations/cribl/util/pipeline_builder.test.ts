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
});
