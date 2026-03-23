/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common';
import { createGetAlertsById } from './get_alert_by_id';

const mockEsClient = {
  search: jest.fn(),
} as unknown as ElasticsearchClient;

const mockAnonymizationFields: AnonymizationFieldResponse[] = [
  { field: 'user.name', allowed: true, id: 'user.name' },
  { field: 'host.name', allowed: true, id: 'host.name' },
  { field: 'event.action', allowed: false, id: 'event.action' },
  {
    field: 'source.ip',
    allowed: true,
    id: 'source.ip',
  },
];

describe('createGetAlertsById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return alerts data by ids', async () => {
    const mockResponse = {
      hits: {
        hits: [
          {
            _id: 'alert1',
            fields: {
              'user.name': ['test-user'],
              'host.name': ['test-host'],
            },
          },
          {
            _id: 'alert2',
            fields: {
              'source.ip': ['192.168.1.1'],
            },
          },
        ],
      },
    };

    (mockEsClient.search as jest.Mock).mockResolvedValue(mockResponse);

    const getAlertsById = createGetAlertsById({
      esClient: mockEsClient,
    });

    const result = await getAlertsById({
      index: 'test-index',
      ids: ['alert1', 'alert2'],
      anonymizationFields: mockAnonymizationFields,
    });

    expect(result).toEqual({
      alert1: {
        'user.name': ['test-user'],
        'host.name': ['test-host'],
      },
      alert2: {
        'source.ip': ['192.168.1.1'],
      },
    });
  });

  it('should filter out non-allowed anonymization fields', async () => {
    const mockResponse = { hits: { hits: [] } };
    (mockEsClient.search as jest.Mock).mockResolvedValue(mockResponse);

    const getAlertsById = createGetAlertsById({
      esClient: mockEsClient,
    });

    await getAlertsById({
      index: 'test-index',
      ids: ['alert1'],
      anonymizationFields: mockAnonymizationFields,
    });

    const calledWith = (mockEsClient.search as jest.Mock).mock.calls[0][0];
    const fields = calledWith.fields.map((f: { field: string }) => f.field);

    expect(fields).not.toContain('event.action');
    expect(fields).toContain('user.name');
    expect(fields).toContain('host.name');
    expect(fields).toContain('source.ip');
  });

  it('should return empty object when no hits are found', async () => {
    const mockResponse = { hits: { hits: [] } };
    (mockEsClient.search as jest.Mock).mockResolvedValue(mockResponse);

    const getAlertsById = createGetAlertsById({
      esClient: mockEsClient,
    });

    const result = await getAlertsById({
      index: 'test-index',
      ids: ['nonexistent'],
      anonymizationFields: mockAnonymizationFields,
    });

    expect(result).toEqual({});
  });

  it('should handle empty ids array', async () => {
    const mockResponse = { hits: { hits: [] } };
    (mockEsClient.search as jest.Mock).mockResolvedValue(mockResponse);

    const getAlertsById = createGetAlertsById({
      esClient: mockEsClient,
    });

    const result = await getAlertsById({
      index: 'test-index',
      ids: [],
      anonymizationFields: mockAnonymizationFields,
    });

    expect(result).toEqual({});
    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 0,
        query: {
          bool: {
            filter: [{ terms: { _id: [] } }],
          },
        },
      })
    );
  });

  it('should handle empty anonymization fields', async () => {
    const mockResponse = { hits: { hits: [] } };
    (mockEsClient.search as jest.Mock).mockResolvedValue(mockResponse);

    const getAlertsById = createGetAlertsById({
      esClient: mockEsClient,
    });

    await getAlertsById({
      index: 'test-index',
      ids: ['alert1'],
      anonymizationFields: [],
    });

    const calledWith = (mockEsClient.search as jest.Mock).mock.calls[0][0];
    expect(calledWith.fields).toEqual([]);
  });
});
