/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';

import { getCreatedDocumentIds } from '.';

const mockBulkResponse: BulkResponse = {
  errors: false,
  took: 0,
  items: [
    {
      create: {
        _index: '.ds-.alerts-security.attack.discovery.alerts-ad-hoc-default-2025.04.21-000001',
        _id: '0771fe50-3524-4f93-b658-fc509550375c',
        _version: 1,
        result: 'created',
        forced_refresh: true,
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
        },
        _seq_no: 302,
        _primary_term: 23,
        status: 201,
      },
    },
    {
      create: {
        _index: '.ds-.alerts-security.attack.discovery.alerts-ad-hoc-default-2025.04.21-000001',
        _id: 'cc4e25d9-2eb2-4e6a-8047-ecd19dd9b3d6',
        _version: 1,
        result: 'created',
        forced_refresh: true,
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
        },
        _seq_no: 303,
        _primary_term: 23,
        status: 201,
      },
    },
    {
      create: {
        _index: '.ds-.alerts-security.attack.discovery.alerts-ad-hoc-default-2025.04.21-000001',
        _id: '05bb4562-6931-40bd-a110-ca2fe4eeb430',
        _version: 1,
        result: 'created',
        forced_refresh: true,
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
        },
        _seq_no: 304,
        _primary_term: 23,
        status: 201,
      },
    },
  ],
};

describe('getCreatedDocumentIds', () => {
  it('returns all created document ids from a successful bulk response', () => {
    const ids = getCreatedDocumentIds(mockBulkResponse);

    expect(ids).toEqual([
      '0771fe50-3524-4f93-b658-fc509550375c',
      'cc4e25d9-2eb2-4e6a-8047-ecd19dd9b3d6',
      '05bb4562-6931-40bd-a110-ca2fe4eeb430',
    ]);
  });

  it('returns an empty array if no items are present', () => {
    const ids = getCreatedDocumentIds({ ...mockBulkResponse, items: [] });

    expect(ids).toEqual([]);
  });

  it('returns only ids where result is "created"', () => {
    const response = {
      ...mockBulkResponse,
      items: [
        { create: { ...mockBulkResponse.items[0].create, result: 'created' } },
        { create: { ...mockBulkResponse.items[1].create, result: 'noop' } },
        { create: { ...mockBulkResponse.items[2].create, result: 'created' } },
      ],
    } as BulkResponse;

    const ids = getCreatedDocumentIds(response);

    expect(ids).toEqual([
      '0771fe50-3524-4f93-b658-fc509550375c',
      '05bb4562-6931-40bd-a110-ca2fe4eeb430',
    ]);
  });

  it('returns an empty array if no items have result "created"', () => {
    const response = {
      ...mockBulkResponse,
      items: mockBulkResponse.items.map((item) => ({
        create: { ...item.create, result: 'noop' },
      })),
    } as BulkResponse;

    const ids = getCreatedDocumentIds(response);

    expect(ids).toEqual([]);
  });

  it('handles missing _id', () => {
    const response = {
      ...mockBulkResponse,
      items: [
        {
          create: {
            ...mockBulkResponse.items[0].create,
            _id: undefined, // <-- missing _id
            _index: mockBulkResponse.items[0].create?._index,
            result: 'created',
          },
        },
      ],
    } as BulkResponse;

    const ids = getCreatedDocumentIds(response);

    expect(ids).toEqual([]);
  });
});
