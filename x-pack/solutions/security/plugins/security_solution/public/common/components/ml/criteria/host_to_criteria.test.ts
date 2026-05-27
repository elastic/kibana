/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { HostItem } from '../../../../../common/search_strategy/security_solution/hosts';
import type { CriteriaFields } from '../types';
import { hostToCriteria } from './host_to_criteria';

describe('host_to_criteria', () => {
  test('converts a host to a criteria', () => {
    const hostItem: HostItem = {
      host: {
        name: ['host-name'],
      },
    };
    const expectedCriteria: CriteriaFields[] = [
      {
        fieldName: 'host.name',
        fieldValue: 'host-name',
      },
    ];
    expect(hostToCriteria({ hostItem })).toEqual(expectedCriteria);
  });

  test('returns an empty array if the host.name is null', () => {
    const hostItem: HostItem = {
      host: {
        // @ts-expect-error
        name: null,
      },
    };
    expect(hostToCriteria({ hostItem })).toEqual([]);
  });

  test('returns an empty array if the host is null', () => {
    const hostItem: HostItem = {
      host: null,
    };
    expect(hostToCriteria({ hostItem })).toEqual([]);
  });

  test('prefers host.id over host.name when id is non-empty', () => {
    const hostItem: HostItem = {
      host: {
        id: ['hid-1'],
        name: ['host-name'],
      },
    };
    expect(hostToCriteria({ hostItem })).toEqual([
      {
        fieldName: 'host.id',
        fieldValue: 'hid-1',
      },
    ]);
  });

  test('returns empty array when euid produces a scoped DSL filter', () => {
    const hostItem: HostItem = { host: { name: ['host-name'] } };
    const entityRecord = { 'host.name': 'host-name' } as unknown as EntityStoreRecord;
    const euid = {
      dsl: {
        getEuidFilterBasedOnDocument: jest.fn().mockReturnValue({ bool: { filter: [] } }),
      },
      getEntityIdentifiersFromDocument: jest.fn(),
    } as unknown as EntityStoreEuid;

    expect(hostToCriteria({ hostItem, entityRecord, euid })).toEqual([]);
    expect(euid.dsl.getEuidFilterBasedOnDocument).toHaveBeenCalledWith('host', entityRecord);
  });

  test('returns identifier map criteria when euid has no scoped DSL filter', () => {
    const hostItem: HostItem = { host: { name: ['host-name'] } };
    const entityRecord = {
      'host.id': 'eid-1',
      'host.name': 'host-name',
    } as unknown as EntityStoreRecord;
    const euid = {
      dsl: {
        getEuidFilterBasedOnDocument: jest.fn().mockReturnValue(undefined),
      },
      getEntityIdentifiersFromDocument: jest.fn().mockReturnValue({
        'host.id': 'eid-1',
        'host.name': 'host-name',
      }),
    } as unknown as EntityStoreEuid;

    expect(hostToCriteria({ hostItem, entityRecord, euid })).toEqual([
      { fieldName: 'host.id', fieldValue: 'eid-1' },
      { fieldName: 'host.name', fieldValue: 'host-name' },
    ]);
    expect(euid.getEntityIdentifiersFromDocument).toHaveBeenCalledWith('host', entityRecord);
  });
});
