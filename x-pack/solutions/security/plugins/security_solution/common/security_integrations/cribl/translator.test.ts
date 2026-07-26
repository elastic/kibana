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

  describe('round-trip with namespace', () => {
    const entriesWithNamespace: RouteEntry[] = [
      { dataId: 'criblSource1', datastream: 'logs-destination1.cloud', namespace: 'production' },
      { dataId: 'criblSource2', datastream: 'logs-destination2' },
    ];

    const configWithNamespace = {
      route_entries: {
        value:
          '[{"dataId":"criblSource1","datastream":"logs-destination1.cloud","namespace":"production"},{"dataId":"criblSource2","datastream":"logs-destination2"}]',
        type: 'textarea',
      },
    } as PackagePolicyConfigRecord;

    it('serializes namespace in route entries', () => {
      const result = getPolicyConfigValueFromRouteEntries(entriesWithNamespace);
      expect(result).toContain('"namespace":"production"');
    });

    it('omits namespace key when namespace is empty string', () => {
      const result = getPolicyConfigValueFromRouteEntries([
        { dataId: 'criblSource1', datastream: 'logs-destination1.cloud', namespace: '' },
      ]);
      expect(result).not.toContain('"namespace"');
    });

    it('omits namespace key when namespace is undefined', () => {
      const result = getPolicyConfigValueFromRouteEntries([
        { dataId: 'criblSource1', datastream: 'logs-destination1.cloud' },
      ]);
      expect(result).not.toContain('"namespace"');
    });

    it('deserializes namespace from policy config', () => {
      const result = getRouteEntriesFromPolicyConfig(configWithNamespace);
      expect(result[0].namespace).toEqual('production');
      expect(result[1].namespace).toBeUndefined();
    });

    it('normalizes empty namespace to undefined when deserializing', () => {
      const configWithEmptyNamespace = {
        route_entries: {
          value:
            '[{"dataId":"criblSource1","datastream":"logs-destination1.cloud","namespace":""}]',
          type: 'textarea',
        },
      } as PackagePolicyConfigRecord;
      const result = getRouteEntriesFromPolicyConfig(configWithEmptyNamespace);
      expect(result[0].namespace).toBeUndefined();
    });

    it('normalizes whitespace-only namespace to undefined when deserializing', () => {
      const configWithWhitespaceNamespace = {
        route_entries: {
          value:
            '[{"dataId":"criblSource1","datastream":"logs-destination1.cloud","namespace":"   "}]',
          type: 'textarea',
        },
      } as PackagePolicyConfigRecord;
      const result = getRouteEntriesFromPolicyConfig(configWithWhitespaceNamespace);
      expect(result[0].namespace).toBeUndefined();
    });
  });
});
