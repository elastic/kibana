/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { mockObservedService } from '../mocks';
import { TestProviders } from '../../../../common/mock';
import { useObservedServiceItems } from './use_observed_service_items';

describe('useObservedServiceItems', () => {
  it('returns observed service fields', () => {
    const { result } = renderHook(() => useObservedServiceItems(mockObservedService), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual([
      {
        field: 'service.id',
        label: 'Service ID',
        getValues: expect.any(Function),
      },
      {
        field: 'service.name',
        getValues: expect.any(Function),
        label: 'Name',
      },
      {
        field: 'service.address',
        getValues: expect.any(Function),
        label: 'Address',
      },
      {
        field: 'service.environment',
        getValues: expect.any(Function),
        label: 'Environment',
      },
      {
        field: 'service.ephemeral_id',
        getValues: expect.any(Function),
        label: 'Ephemeral ID',
      },
      {
        field: 'service.node.name',
        getValues: expect.any(Function),
        label: 'Node name',
      },
      {
        field: 'service.node.roles',
        getValues: expect.any(Function),
        label: 'Node roles',
      },
      {
        field: 'service.node.role',
        getValues: expect.any(Function),
        label: 'Node role',
      },
      {
        field: 'service.state',
        getValues: expect.any(Function),
        label: 'State',
      },
      {
        field: 'service.type',
        getValues: expect.any(Function),
        label: 'Type',
      },
      {
        field: 'service.version',
        getValues: expect.any(Function),
        label: 'Version',
      },
      {
        label: 'First seen',
        render: expect.any(Function),
      },
      {
        label: 'Last seen',
        render: expect.any(Function),
      },
    ]);

    expect(
      result.current.map(({ getValues }) => getValues && getValues(mockObservedService))
    ).toEqual([
      ['test id'], // id
      ['test name', 'another test name'], // name
      ['test address'], // address
      ['test environment'], // environment
      ['test ephemeral_id'], // ephemeral_id
      ['test node name'], // node name
      ['test node roles'], // node roles
      ['test node role'], // node roles
      ['test state'], // state
      ['test type'], // type
      ['test version'], // version
      undefined,
      undefined,
    ]);
  });
});
