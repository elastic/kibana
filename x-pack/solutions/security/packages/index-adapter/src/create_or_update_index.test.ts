/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { updateIndices, createIndex, createOrUpdateIndex } from './create_or_update_index';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

esClient.indices.putMapping.mockResolvedValue({ acknowledged: true });
esClient.indices.putSettings.mockResolvedValue({ acknowledged: true });

const simulateIndexTemplateResponse = { template: { mappings: {}, settings: {}, aliases: {} } };
esClient.indices.simulateIndexTemplate.mockResolvedValue(simulateIndexTemplateResponse);

const name = 'test_index_name';
const totalFieldsLimit = 1000;

describe('updateIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`should update indices and expand patterns`, async () => {
    const indexName = 'test_index_name-default';
    esClient.indices.get.mockResolvedValueOnce({ [indexName]: {} });

    await updateIndices({
      esClient,
      logger,
      name,
      totalFieldsLimit,
      expandIndexPattern: true,
    });

    expect(esClient.indices.get).toHaveBeenCalledWith({
      index: name,
      expand_wildcards: 'all',
    });

    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: indexName,
      settings: { 'index.mapping.total_fields.limit': totalFieldsLimit },
    });
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name: indexName,
    });
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: indexName,
      ...simulateIndexTemplateResponse.template.mappings,
    });
  });

  it(`should update multiple indices`, async () => {
    const indexName1 = 'test_index_name-1';
    const indexName2 = 'test_index_name-2';
    esClient.indices.get.mockResolvedValueOnce({ [indexName1]: {}, [indexName2]: {} });

    await updateIndices({
      esClient,
      logger,
      name,
      totalFieldsLimit,
      expandIndexPattern: true,
    });

    expect(esClient.indices.putSettings).toHaveBeenCalledTimes(2);
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
  });

  it(`should not update indices when not exist`, async () => {
    esClient.indices.get.mockResolvedValueOnce({});

    await updateIndices({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.putSettings).not.toHaveBeenCalled();
    expect(esClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  describe('expand Index pattern', () => {
    it(`should expand index pattern when updating indices`, async () => {
      const indexName1 = 'test_index_name-1';
      const indexName2 = 'test_index_name-2';
      esClient.indices.get.mockResolvedValueOnce({ [indexName1]: {}, [indexName2]: {} });

      await updateIndices({
        esClient,
        logger,
        name: 'test_index_name-*',
        totalFieldsLimit,
        expandIndexPattern: true,
      });

      expect(esClient.indices.get).toHaveBeenCalledWith({
        index: 'test_index_name-*',
        expand_wildcards: 'all',
      });

      expect(esClient.indices.putSettings).toHaveBeenCalledTimes(2);

      expect(esClient.indices.putSettings).toHaveBeenNthCalledWith(2, {
        index: indexName2,
        settings: { 'index.mapping.total_fields.limit': 1000 },
      });

      expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);

      expect(esClient.indices.putMapping).toHaveBeenNthCalledWith(2, {
        index: indexName2,
        write_index_only: undefined,
      });
    });
    it('should not update indices when index pattern does not expand to any existing indices', async () => {
      const indexName1 = 'test_index_name-1';
      const indexName2 = 'test_index_name-2';
      esClient.indices.get.mockResolvedValueOnce({ [indexName1]: {}, [indexName2]: {} });

      await updateIndices({
        esClient,
        logger,
        name: 'test_index_name-*',
        totalFieldsLimit,
        expandIndexPattern: false,
      });

      expect(esClient.indices.get).toHaveBeenCalledWith({
        index: 'test_index_name-*',
        expand_wildcards: 'all',
      });

      expect(esClient.indices.putSettings).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          index: 'test_index_name-*',
          settings: { 'index.mapping.total_fields.limit': 1000 },
        })
      );
      expect(esClient.indices.putMapping).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          index: 'test_index_name-*',
          write_index_only: undefined,
        })
      );
    });
  });
});

describe('createIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`should create index`, async () => {
    esClient.indices.exists.mockResolvedValueOnce(false);

    await createIndex({
      esClient,
      logger,
      name,
    });

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: name, expand_wildcards: 'all' });
    expect(esClient.indices.create).toHaveBeenCalledWith({ index: name });
  });

  it(`should not create index if already exists`, async () => {
    esClient.indices.exists.mockResolvedValueOnce(true);

    await createIndex({
      esClient,
      logger,
      name,
    });

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: name, expand_wildcards: 'all' });
    expect(esClient.indices.create).not.toHaveBeenCalled();
  });
});

describe('createOrUpdateIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`should create index if not exists`, async () => {
    esClient.indices.exists.mockResolvedValueOnce(false);

    await createOrUpdateIndex({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.create).toHaveBeenCalledWith({ index: name });
  });

  it(`should update index if already exists`, async () => {
    esClient.indices.exists.mockResolvedValueOnce(true);

    await createOrUpdateIndex({
      esClient,
      logger,
      name,
      totalFieldsLimit,
    });

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: name, expand_wildcards: 'all' });

    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: name,
      settings: { 'index.mapping.total_fields.limit': totalFieldsLimit },
    });
    expect(esClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
      name,
    });
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: name,
      ...simulateIndexTemplateResponse.template.mappings,
    });
  });
});
