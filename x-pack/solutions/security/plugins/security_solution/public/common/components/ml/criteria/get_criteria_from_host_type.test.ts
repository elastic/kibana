/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

import { getCriteriaFromHostType } from './get_criteria_from_host_type';
import { HostsType } from '../../../../explore/hosts/store/model';

describe('get_criteria_from_host_type', () => {
  test('returns host names from criteria if the host type is details', () => {
    const criteria = getCriteriaFromHostType(HostsType.details, 'zeek-iowa');
    expect(criteria).toEqual([{ fieldName: 'host.name', fieldValue: 'zeek-iowa' }]);
  });

  test('returns empty array from criteria if the host type is page but rather an empty array', () => {
    const criteria = getCriteriaFromHostType(HostsType.page, 'zeek-iowa');
    expect(criteria).toEqual([]);
  });

  test('returns empty array from criteria if the host name is undefined and host type is details', () => {
    const criteria = getCriteriaFromHostType(HostsType.details, undefined);
    expect(criteria).toEqual([]);
  });

  test('without EUID API, identity fields alone still use legacy host.name criteria', () => {
    const criteria = getCriteriaFromHostType(HostsType.details, 'zeek-iowa', {
      'host.id': 'hid-1',
      'host.name': 'zeek-iowa',
    });
    expect(criteria).toEqual([{ fieldName: 'host.name', fieldValue: 'zeek-iowa' }]);
  });

  test('with EUID API, uses identifier map when scoped DSL is unavailable', () => {
    const euid = {
      dsl: {
        getEuidFilterBasedOnDocument: jest.fn().mockReturnValue(undefined),
      },
      getEntityIdentifiersFromDocument: jest.fn().mockReturnValue({
        'host.id': 'hid-1',
        'host.name': 'zeek-iowa',
      }),
    } as unknown as EntityStoreEuid;

    const criteria = getCriteriaFromHostType(
      HostsType.details,
      'zeek-iowa',
      {
        'host.id': 'hid-1',
        'host.name': 'zeek-iowa',
      },
      euid
    );
    expect(criteria).toEqual([
      { fieldName: 'host.id', fieldValue: 'hid-1' },
      { fieldName: 'host.name', fieldValue: 'zeek-iowa' },
    ]);
  });
});
