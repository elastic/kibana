/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { filterUnchangedByVersion } from './filter_unchanged_by_version';

interface Item {
  id: string;
  version: string;
}

const item = (id: string, version = '1'): Item => ({ id, version });

describe('filterUnchangedByVersion', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();

  const filterItemsMock = (items: Item[]) =>
    filterUnchangedByVersion({
      esClient,
      index: 'idx',
      logger,
      items,
      getItemDetails: ({ id, version }) => ({ id, version }),
    });

  const storedDocs = (docs: object[]) => esClient.mget.mockResolvedValue({ docs } as never);

  const makeDoc = (id: string, version?: string, found = true) => ({
    _index: 'idx',
    _id: id,
    found,
    ...(found && { _source: version ? { version } : {} }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip items whose stored version is unchanged', async () => {
    storedDocs([makeDoc('a', '1')]);
    expect(await filterItemsMock([item('a', '1')])).toEqual([]);
  });

  it('should keep items whose stored version differs', async () => {
    storedDocs([makeDoc('a', '1')]);
    expect(await filterItemsMock([item('a', '2')])).toEqual([item('a', '2')]);
  });

  it('should keep items that are not indexed yet', async () => {
    storedDocs([makeDoc('a', undefined, false)]);
    expect(await filterItemsMock([item('a')])).toEqual([item('a')]);
  });

  it('should keep items stored without a version', async () => {
    storedDocs([makeDoc('a')]);
    expect(await filterItemsMock([item('a')])).toEqual([item('a')]);
  });

  it('should keep items when the index does not exist', async () => {
    storedDocs([
      { _index: 'idx', _id: 'a', error: { type: 'index_not_found_exception', reason: 'x' } },
    ]);
    expect(await filterItemsMock([item('a')])).toEqual([item('a')]);
  });

  it('should not query Elasticsearch when there is nothing to check', async () => {
    await filterItemsMock([]);
    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('should keep all items when the stored versions cannot be read', async () => {
    esClient.mget.mockRejectedValue(new Error('boom'));
    expect(await filterItemsMock([item('a'), item('b')])).toEqual([item('a'), item('b')]);
  });

  it('should warn with the index, count and reason when the stored versions cannot be read', async () => {
    esClient.mget.mockRejectedValue(new Error('boom'));
    await filterItemsMock([item('a'), item('b')]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to read indexed versions from idx, re-indexing all 2 documents: boom'
    );
  });
});
