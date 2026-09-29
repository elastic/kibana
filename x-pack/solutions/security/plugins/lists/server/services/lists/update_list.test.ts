/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';

import { updateList } from './update_list';
import { getList } from './get_list';
import { getUpdateListOptionsMock } from './update_list.mock';

vi.mock('../utils', () => {
  const mocked = {
    checkVersionConflict: vi.fn(),
    waitUntilDocumentIndexed: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./get_list', () => {
  const mocked = {
    getList: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('update_list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('it returns an updated list', async () => {
    const list: ListSchema = {
      ...getListResponseMock(),
    };
    (getList as unknown as Mock).mockResolvedValueOnce(list);
    const options = getUpdateListOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResolvedValue({ updated: 1 });
    const updatedList = await updateList({ ...options, esClient });
    const expected: ListSchema = {
      ...getListResponseMock(),
      id: list.id,
    };
    expect(updatedList).toEqual(expected);
  });

  test('it returns null when there is not a list to update', async () => {
    (getList as unknown as Mock).mockResolvedValueOnce(null);
    const options = getUpdateListOptionsMock();
    const updatedList = await updateList(options);
    expect(updatedList).toEqual(null);
  });

  test('throw error if no list was updated', async () => {
    const list: ListSchema = {
      ...getListResponseMock(),
    };
    (getList as unknown as Mock).mockResolvedValueOnce(list);
    const options = getUpdateListOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResolvedValue({ updated: 0 });
    await expect(updateList({ ...options, esClient })).rejects.toThrow('No list has been updated');
  });
});
