/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { Start as DataPublicStartMock } from '@kbn/data-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { fleetMock } from '@kbn/fleet-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';

type DataMock = Omit<DataPublicStartMock, 'indexPatterns' | 'query'> & {
  indexPatterns: Omit<DataPublicStartMock['indexPatterns'], 'getFieldsForWildcard'> & {
    getFieldsForWildcard: jest.Mock;
  };
  // We can't Omit (override) 'query' here because FilterManager is a class not an interface.
  // Because of this, wherever FilterManager is used tsc expects some FilterManager private fields
  // like filters, updated$, fetch$ to be part of the type. Omit removes these private fields when used.
  query: DataPublicStartMock['query'] & {
    filterManager: {
      setFilters: jest.Mock;
      getUpdates$: jest.Mock;
    };
  };
};

/**
 * Type for our app's depsStart (plugin start dependencies)
 */
export interface DepsStartMock {
  data: DataMock;
  fleet: FleetStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

/**
 * Returns a mock of our app's depsStart (plugin start dependencies)
 */
export const depsStartMock: () => DepsStartMock = () => {
  const dataMock: DataMock = dataPluginMock.createStartContract() as unknown as DataMock;
  dataMock.indexPatterns.getFieldsForWildcard = jest.fn();
  dataMock.query.filterManager.setFilters = jest.fn();
  dataMock.query.filterManager.getUpdates$ = jest.fn(() => {
    return {
      subscribe: jest.fn(() => {
        return {
          unsubscribe: jest.fn(),
        };
      }),
    };
  }) as DataMock['query']['filterManager']['getUpdates$'];

  return {
    data: dataMock,
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    fleet: fleetMock.createStartMock(),
  };
};
