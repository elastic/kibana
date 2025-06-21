/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValueListsMetrics } from './get_metrics';
import { getListsOverview } from './queries/get_lists_overview';
import { getListItemsOverview } from './queries/get_list_items_overview';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

jest.mock('./queries/get_lists_overview', () => ({
  getListsOverview: jest.fn(),
}));

jest.mock('./queries/get_list_items_overview', () => ({
  getListItemsOverview: jest.fn(),
}));

describe('getValueListsMetrics', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    jest.clearAllMocks();
  });

  it('returns combined metrics from getListsOverview and getListItemsOverview', async () => {
    const mockListsOverview = {
      binary: 1,
      boolean: 2,
      keyword: 3,
      total: 6,
    };

    const mockItemsOverview = {
      total: 15,
      max_items_per_list: 10,
      min_items_per_list: 5,
      average_items_per_list: 7.5,
    };

    (getListsOverview as jest.Mock).mockResolvedValueOnce(mockListsOverview);
    (getListItemsOverview as jest.Mock).mockResolvedValueOnce(mockItemsOverview);

    const result = await getValueListsMetrics({ esClient, logger });

    expect(result).toEqual({
      lists_overview: mockListsOverview,
      items_overview: mockItemsOverview,
    });

    expect(getListsOverview).toHaveBeenCalledWith({ esClient, logger });
    expect(getListItemsOverview).toHaveBeenCalledWith({ esClient, logger });
  });

  it('handles errors gracefully when getListsOverview fails', async () => {
    const mockItemsOverview = {
      total: 15,
      max_items_per_list: 10,
      min_items_per_list: 5,
      average_items_per_list: 7.5,
    };

    (getListsOverview as jest.Mock).mockRejectedValueOnce(new Error('Lists overview failed'));
    (getListItemsOverview as jest.Mock).mockResolvedValueOnce(mockItemsOverview);

    const result = await getValueListsMetrics({ esClient, logger });

    expect(result).toEqual({
      lists_overview: {},
      items_overview: mockItemsOverview,
    });

    expect(getListsOverview).toHaveBeenCalledWith({ esClient, logger });
    expect(getListItemsOverview).toHaveBeenCalledWith({ esClient, logger });
  });

  it('handles errors gracefully when getListItemsOverview fails', async () => {
    const mockListsOverview = {
      binary: 1,
      boolean: 2,
      keyword: 3,
      total: 6,
    };

    (getListsOverview as jest.Mock).mockResolvedValueOnce(mockListsOverview);
    (getListItemsOverview as jest.Mock).mockRejectedValueOnce(new Error('Items overview failed'));

    const result = await getValueListsMetrics({ esClient, logger });

    expect(result).toEqual({
      lists_overview: mockListsOverview,
      items_overview: {},
    });

    expect(getListsOverview).toHaveBeenCalledWith({ esClient, logger });
    expect(getListItemsOverview).toHaveBeenCalledWith({ esClient, logger });
  });

  it('handles errors gracefully when both functions fail', async () => {
    (getListsOverview as jest.Mock).mockRejectedValueOnce(new Error('Lists overview failed'));
    (getListItemsOverview as jest.Mock).mockRejectedValueOnce(new Error('Items overview failed'));

    const result = await getValueListsMetrics({ esClient, logger });

    expect(result).toEqual({
      lists_overview: {},
      items_overview: {},
    });

    expect(getListsOverview).toHaveBeenCalledWith({ esClient, logger });
    expect(getListItemsOverview).toHaveBeenCalledWith({ esClient, logger });
  });
});
