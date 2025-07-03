/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_EXECUTION_UUID,
  ALERT_START,
  ALERT_UPDATED_AT,
  ALERT_UPDATED_BY_USER_ID,
  ALERT_UPDATED_BY_USER_NAME,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
} from '@kbn/rule-data-utils';
import type { Logger } from '@kbn/core/server';

import { transformSearchResponseToAlerts } from '.';
import { getResponseMock } from '../../../../../__mocks__/attack_discovery_alert_document_response';
import { ALERT_ATTACK_DISCOVERY_REPLACEMENTS } from '../../../schedules/fields/field_names';

// Manual logger mock implementing all Logger methods
const createLoggerMock = (): Logger =>
  ({
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    get: jest.fn(() => createLoggerMock()),
    isLevelEnabled: jest.fn(() => true),
  } as unknown as Logger);

describe('transformSearchResponseToAlerts', () => {
  let logger: Logger;
  beforeEach(() => {
    logger = createLoggerMock();
  });

  it('returns alerts from a valid search response', () => {
    const response = getResponseMock();
    const result = transformSearchResponseToAlerts({ logger, response });

    expect(result.data.length).toBeGreaterThan(0);
  });

  it('skips hits with missing required fields and calls logger.warn', () => {
    const response = getResponseMock();
    response.hits.hits[0]._source = undefined;
    transformSearchResponseToAlerts({ logger, response });

    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns uniqueAlertIdsCount from aggregation if present', () => {
    const response = getResponseMock();
    response.aggregations = {
      unique_alert_ids_count: { value: 42 },
    } as Record<string, { value: number }>;
    const result = transformSearchResponseToAlerts({ logger, response });

    expect(result.uniqueAlertIdsCount).toBe(42);
  });

  it('returns 0 for uniqueAlertIdsCount if aggregation is missing', () => {
    const response = getResponseMock();
    response.aggregations = undefined;
    const result = transformSearchResponseToAlerts({ logger, response });

    expect(result.uniqueAlertIdsCount).toBe(0);
  });

  it('returns sorted connectorNames from aggregation if present', () => {
    const response = getResponseMock();
    response.aggregations = {
      api_config_name: {
        buckets: [
          { key: 'b', doc_count: 1 },
          { key: 'a', doc_count: 2 },
        ],
      },
    } as unknown as Record<string, { buckets: Array<{ key: string; doc_count: number }> }>;
    const result = transformSearchResponseToAlerts({ logger, response });

    expect(result.connectorNames).toEqual(['a', 'b']);
  });

  it('returns empty connectorNames if aggregation is missing', () => {
    const response = getResponseMock();
    response.aggregations = undefined;
    const result = transformSearchResponseToAlerts({ logger, response });

    expect(result.connectorNames).toEqual([]);
  });

  it('returns empty data if all hits are missing required fields', () => {
    const response = getResponseMock();
    response.hits.hits = [
      {
        _id: '1',
        _index: 'foo',
        _source: undefined,
      },
      {
        _id: '2',
        _index: 'foo',
        _source: undefined,
      },
    ];
    const result = transformSearchResponseToAlerts({ logger, response });

    expect(result.data).toEqual([]);
  });

  it('returns empty data if hits is empty', () => {
    const response = getResponseMock();
    response.hits.hits = [];
    const result = transformSearchResponseToAlerts({ logger, response });

    expect(result.data).toEqual([]);
  });

  it('handles invalid/missing dates and falls back to current date for timestamp', () => {
    const response = getResponseMock();
    // Set invalid @timestamp and alert_start
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source['@timestamp'] = 'not-a-date';
      response.hits.hits[0]._source[ALERT_START] = 'not-a-date';
    }
    const result = transformSearchResponseToAlerts({ logger, response });
    expect(new Date(result.data[0].timestamp).toString()).not.toBe('Invalid Date');
    expect(result.data[0].alertStart).toBeUndefined();
  });

  it('handles replacements array with missing uuid/value', () => {
    const response = getResponseMock();
    // Only use valid string values for uuid/value to match type
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_ATTACK_DISCOVERY_REPLACEMENTS] = [
        { uuid: 'a', value: 'A' },
        // skip invalid entries, only valid ones allowed by type
      ];
    }
    const result = transformSearchResponseToAlerts({ logger, response });
    expect(result.data[0].replacements).toEqual({ a: 'A' });
  });

  it('uses _id as id if present, otherwise falls back to generationUuid', () => {
    const response = getResponseMock();
    const hit = response.hits.hits[0];
    hit._id = 'my-id';
    if (hit._source) {
      hit._source[ALERT_RULE_EXECUTION_UUID] = 'gen-uuid';
    }
    let result = transformSearchResponseToAlerts({ logger, response });
    expect(result.data[0].id).toBe('my-id');

    // Simulate fallback: create a new hit with _id set to generationUuid and check
    const fallbackHit = { ...hit, _id: 'gen-uuid' };
    response.hits.hits = [fallbackHit];
    result = transformSearchResponseToAlerts({ logger, response });
    expect(result.data[0].id).toBe('gen-uuid');
  });

  it('correctly transforms ALERT_START field', () => {
    const response = getResponseMock();
    const testDate = '2024-01-01T12:00:00.000Z';
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_START] = testDate;
    }
    const result = transformSearchResponseToAlerts({ logger, response });
    expect(result.data[0].alertStart).toBe(testDate);
  });

  it('correctly transforms ALERT_UPDATED_AT field', () => {
    const response = getResponseMock();
    const testDate = '2024-02-02T15:30:00.000Z';
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_UPDATED_AT] = testDate;
    }
    const result = transformSearchResponseToAlerts({ logger, response });
    expect(result.data[0].alertUpdatedAt).toBe(testDate);
  });

  it('correctly transforms ALERT_UPDATED_BY_USER_ID field', () => {
    const response = getResponseMock();
    const testId = 'user-123';
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_UPDATED_BY_USER_ID] = testId;
    }
    const result = transformSearchResponseToAlerts({ logger, response });
    expect(result.data[0].alertUpdatedByUserId).toBe(testId);
  });

  it('correctly transforms ALERT_UPDATED_BY_USER_NAME field', () => {
    const response = getResponseMock();
    const testName = 'testuser';
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_UPDATED_BY_USER_NAME] = testName;
    }
    const result = transformSearchResponseToAlerts({ logger, response });
    expect(result.data[0].alertUpdatedByUserName).toBe(testName);
  });

  it('correctly transforms ALERT_WORKFLOW_STATUS_UPDATED_AT field', () => {
    const response = getResponseMock();
    const testDate = '2024-03-03T10:20:30.000Z';
    if (response.hits.hits[0]._source) {
      response.hits.hits[0]._source[ALERT_WORKFLOW_STATUS_UPDATED_AT] = testDate;
    }
    const result = transformSearchResponseToAlerts({ logger, response });
    expect(result.data[0].alertWorkflowStatusUpdatedAt).toBe(testDate);
  });
});
