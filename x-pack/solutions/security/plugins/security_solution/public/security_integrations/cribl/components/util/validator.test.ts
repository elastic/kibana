/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteEntry } from '../../../../../common/security_integrations/cribl/types';
import { allRouteEntriesArePaired, hasAtLeastOneValidRouteEntry } from './validator';

describe('validator: hasAtLeastOneValidRouteEntry', () => {
  it('empty route entries => invalid', () => {
    const routeEntries = [] as RouteEntry[];
    const result = hasAtLeastOneValidRouteEntry(routeEntries);
    expect(result).toBeFalsy();
  });

  it('>0 pair route entries => valid', () => {
    const routeEntries = [
      { dataId: 'criblSource1', datastream: 'logs-destination1.cloud' },
    ] as RouteEntry[];
    const result = hasAtLeastOneValidRouteEntry(routeEntries);
    expect(result).toBeTruthy();
  });
});

describe('validator: allRouteEntriesArePaired', () => {
  it('only dataId => invalid', () => {
    const routeEntries = [
      { dataId: 'criblSource1', datastream: 'logs-destination1.cloud' },
      { dataId: 'criblSource2', datastream: '' },
    ] as RouteEntry[];
    const result = allRouteEntriesArePaired(routeEntries);
    expect(result).toBeFalsy();
  });

  it('only datastream => invalid', () => {
    const routeEntries = [
      { dataId: '', datastream: 'logs-destination1.cloud' },
      { dataId: 'criblSource2', datastream: 'logs-destination2' },
    ] as RouteEntry[];
    const result = allRouteEntriesArePaired(routeEntries);
    expect(result).toBeFalsy();
  });

  it('all paired route entries => valid', () => {
    const routeEntries = [
      { dataId: 'criblSource1', datastream: 'logs-destination1.cloud' },
      { dataId: 'criblSource2', datastream: 'logs-destination2' },
      { dataId: 'criblSource3', datastream: 'logs-destination3.log' },
      { dataId: 'criblSource4', datastream: 'logs-destination4' },
      { dataId: 'criblSource5', datastream: 'logs-destination5' },
    ] as RouteEntry[];
    const result = allRouteEntriesArePaired(routeEntries);
    expect(result).toBeTruthy();
  });
});
