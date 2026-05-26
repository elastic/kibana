/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useObservedUserFields } from './use_observed_user_fields';
import { mockObservedUser } from '../../../../../flyout/entity_details/user_right/mocks';
import { TestProviders } from '../../../../../common/mock';

describe('useObservedUserFields', () => {
  it('returns observed user fields', () => {
    const { result } = renderHook(() => useObservedUserFields(mockObservedUser), {
      wrapper: TestProviders,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Array [
        Object {
          "field": "user.id",
          "getValues": [Function],
          "label": "User ID",
        },
        Object {
          "field": "user.domain",
          "getValues": [Function],
          "label": "Domain",
        },
        Object {
          "label": "First seen",
          "render": [Function],
        },
        Object {
          "label": "Last seen",
          "render": [Function],
        },
        Object {
          "field": "host.os.name",
          "getValues": [Function],
          "label": "Operating system",
        },
        Object {
          "field": "host.os.family",
          "getValues": [Function],
          "label": "Family",
        },
        Object {
          "field": "host.ip",
          "getValues": [Function],
          "label": "IP addresses",
        },
        Object {
          "isVisible": [Function],
          "label": "Max anomaly score by job",
          "render": [Function],
        },
      ]
    `);

    expect(result.current.map(({ getValues }) => getValues && getValues(mockObservedUser))).toEqual(
      [
        ['1234', '321'],
        ['test domain', 'another test domain'],
        undefined, // First seen doesn't implement getValues
        undefined, // Last seen doesn't implement getValues
        ['testOs'],
        ['testFamily'],
        ['10.0.0.1', '127.0.0.1'],
        undefined, // Max anomaly score by job doesn't implement getValues
      ]
    );
  });
});
