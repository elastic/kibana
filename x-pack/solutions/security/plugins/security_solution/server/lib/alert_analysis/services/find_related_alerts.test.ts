/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { findRelatedAlerts } from './find_related_alerts';

describe('findRelatedAlerts', () => {
  const esClient = {
    get: jest.fn(),
    search: jest.fn(),
  } as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty result when no source entities are present', async () => {
    (esClient.get as jest.Mock).mockResolvedValue({
      _source: { 'kibana.alert.rule.name': 'Rule' },
    });

    const result = await findRelatedAlerts(esClient, {
      alertId: 'alert-1',
      alertsIndex: '.alerts-security.alerts-default',
      timeWindowHours: 24,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.relatedAlerts).toEqual([]);
      expect(result.returnedCount).toBe(0);
      expect(result.isTruncated).toBe(false);
    }
  });

  it('skips alert GET when entity shortcut params are provided', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [
          {
            _id: 'related-1',
            _index: '.alerts-security.alerts-default',
            _source: { message: 'related' },
          },
        ],
      },
    });

    const result = await findRelatedAlerts(esClient, {
      alertId: 'alert-1',
      alertsIndex: '.alerts-security.alerts-default',
      timeWindowHours: 24,
      hostNames: ['host-a'],
      userNames: ['user-a'],
    });

    expect(esClient.get).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('uses token-budgeted defaults and emits truncation metadata', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      hits: {
        total: { value: 99, relation: 'eq' },
        hits: [
          {
            _id: 'related-1',
            _index: '.alerts-security.alerts-default',
            _source: { message: 'related' },
          },
        ],
      },
    });

    const result = await findRelatedAlerts(esClient, {
      alertId: 'alert-1',
      alertsIndex: '.alerts-security.alerts-default',
      timeWindowHours: 24,
      hostNames: ['host-a'],
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 25,
        _source: expect.arrayContaining(['@timestamp', 'message', 'host.name']),
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.totalMatched).toBe(99);
      expect(result.returnedCount).toBe(1);
      expect(result.isTruncated).toBe(true);
    }
  });
});
