/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';

import { resolveExceptionListIds } from './resolve_exception_list_ids';
import { getExceptionList } from './get_exception_list';

jest.mock('./get_exception_list');

describe('resolveExceptionListIds', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it resolves every list_id that exists into its full exception list', async () => {
    const list1 = { ...getExceptionListSchemaMock(), id: 'so-1', list_id: 'list-1' };
    const list2 = { ...getExceptionListSchemaMock(), id: 'so-2', list_id: 'list-2' };

    (getExceptionList as jest.Mock).mockResolvedValueOnce(list1).mockResolvedValueOnce(list2);

    const result = await resolveExceptionListIds({
      listIds: ['list-1', 'list-2'],
      namespaceType: 'single',
      savedObjectsClient: savedObjectsClientMock.create(),
    });

    expect(result.lists).toEqual([list1, list2]);
    expect(result.listIds).toEqual([]);
  });

  test('it returns unresolved list_ids separately from resolved lists', async () => {
    const list1 = { ...getExceptionListSchemaMock(), id: 'so-1', list_id: 'list-1' };

    (getExceptionList as jest.Mock).mockResolvedValueOnce(list1).mockResolvedValueOnce(null);

    const result = await resolveExceptionListIds({
      listIds: ['list-1', 'missing-list'],
      namespaceType: 'single',
      savedObjectsClient: savedObjectsClientMock.create(),
    });

    expect(result.lists).toEqual([list1]);
    expect(result.listIds).toEqual(['missing-list']);
  });

  test('it returns an empty result when no list_ids resolve', async () => {
    (getExceptionList as jest.Mock).mockResolvedValue(null);

    const result = await resolveExceptionListIds({
      listIds: ['missing-1', 'missing-2'],
      namespaceType: 'single',
      savedObjectsClient: savedObjectsClientMock.create(),
    });

    expect(result.lists).toEqual([]);
    expect(result.listIds).toEqual(['missing-1', 'missing-2']);
  });

  test('it short-circuits without calling getExceptionList when given no list_ids', async () => {
    const result = await resolveExceptionListIds({
      listIds: [],
      namespaceType: 'single',
      savedObjectsClient: savedObjectsClientMock.create(),
    });

    expect(result).toEqual({ listIds: [], lists: [] });
    expect(getExceptionList).not.toHaveBeenCalled();
  });
});
