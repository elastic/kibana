/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import type { RouteEntry } from './types';
import {
  getRouteEntriesFromPolicyConfig,
  getPolicyConfigValueFromRouteEntries,
} from './translator';

describe('translater', () => {
  const routeEntries = [
    { dataId: 'criblSource1', datastream: 'logs-destination1.cloud' },
    { dataId: 'criblSource2', datastream: 'logs-destination2' },
  ] as RouteEntry[];

  const routeEntriesPlusEmpty = [
    { dataId: 'criblSource1', datastream: 'logs-destination1.cloud' },
    { dataId: 'criblSource2', datastream: 'logs-destination2' },
    { dataId: '', datastream: '' },
  ] as RouteEntry[];

  const policyConfig = {
    route_entries: {
      value:
        '[{"dataId":"criblSource1","datastream":"logs-destination1.cloud"},{"dataId":"criblSource2","datastream":"logs-destination2"}]',
      type: 'textarea',
    },
  } as PackagePolicyConfigRecord;

  const testString: string =
    '[{"dataId":"criblSource1","datastream":"logs-destination1.cloud"},{"dataId":"criblSource2","datastream":"logs-destination2"}]';

  describe('translate from PackagePolicyConfigRecord to RouteEntry[]', () => {
    it('translate', () => {
      const result = getRouteEntriesFromPolicyConfig(policyConfig);
      expect(result).toEqual(routeEntries);
    });

    it('empty translation', () => {
      const emptyRouteEntries = {
        route_entries: {
          value: undefined,
        },
      };
      const result = getRouteEntriesFromPolicyConfig(emptyRouteEntries);
      expect(result).toEqual([]);
    });
  });

  describe('translate from RouteEntry[] to PackagePolicyConfigRecord', () => {
    it('translate', () => {
      const result = getPolicyConfigValueFromRouteEntries(routeEntries);
      expect(result).toEqual(testString);
    });

    it('translate removes empty', () => {
      const result = getPolicyConfigValueFromRouteEntries(routeEntriesPlusEmpty);
      expect(result).toEqual(testString);
    });

    it('empty translation', () => {
      const result = getPolicyConfigValueFromRouteEntries([]);
      expect(result).toEqual('[]');
    });
  });
});
