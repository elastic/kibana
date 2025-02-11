/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    expect(hostToCriteria(hostItem)).toEqual(expectedCriteria);
  });

  test('returns an empty array if the host.name is null', () => {
    const hostItem: HostItem = {
      host: {
        // @ts-expect-error
        name: null,
      },
    };
    expect(hostToCriteria(hostItem)).toEqual([]);
  });

  test('returns an empty array if the host is null', () => {
    const hostItem: HostItem = {
      host: null,
    };
    expect(hostToCriteria(hostItem)).toEqual([]);
  });
});
