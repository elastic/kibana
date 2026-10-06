/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { parseAlertBasedTilesResponse } from './use_entities_with_alerts_tiles';

const makeResponse = (
  columns: Array<{ name: string; type: string }>,
  values: Array<Array<unknown>>
): ESQLSearchResponse => ({ columns, values } as unknown as ESQLSearchResponse);

describe('parseAlertBasedTilesResponse', () => {
  it('returns zeros and empty arrays when there are no rows', () => {
    const result = parseAlertBasedTilesResponse(makeResponse([], []));
    expect(result).toEqual({
      severeAlertsCount: 0,
      severeAlertsEntityIds: [],
      watchlistedCount: 0,
      watchlistedEntityIds: [],
      newAlertingCount: 0,
      newAlertingEntityIds: [],
    });
  });

  it('parses all columns from a single-row response', () => {
    const result = parseAlertBasedTilesResponse(
      makeResponse(
        [
          { name: 'severe_alerts_count', type: 'long' },
          { name: 'severe_alerts_entity_ids', type: 'keyword' },
          { name: 'watchlisted_count', type: 'long' },
          { name: 'watchlisted_entity_ids', type: 'keyword' },
          { name: 'new_alerting_count', type: 'long' },
          { name: 'new_alerting_entity_ids', type: 'keyword' },
        ],
        [[42, ['host:web01', 'user:alice@okta'], 3, ['user:alice@okta'], 1, ['host:web01']]]
      )
    );
    expect(result).toEqual({
      severeAlertsCount: 42,
      severeAlertsEntityIds: ['host:web01', 'user:alice@okta'],
      watchlistedCount: 3,
      watchlistedEntityIds: ['user:alice@okta'],
      newAlertingCount: 1,
      newAlertingEntityIds: ['host:web01'],
    });
  });

  it('handles a scalar (single) entity ID as a string', () => {
    const result = parseAlertBasedTilesResponse(
      makeResponse(
        [
          { name: 'severe_alerts_count', type: 'long' },
          { name: 'severe_alerts_entity_ids', type: 'keyword' },
          { name: 'watchlisted_count', type: 'long' },
          { name: 'watchlisted_entity_ids', type: 'keyword' },
        ],
        [[1, 'host:web01', 0, null]]
      )
    );
    expect(result.severeAlertsEntityIds).toEqual(['host:web01']);
    expect(result.watchlistedEntityIds).toEqual([]);
  });

  it('returns zero count when the count column value is not a number', () => {
    const result = parseAlertBasedTilesResponse(
      makeResponse(
        [
          { name: 'severe_alerts_count', type: 'long' },
          { name: 'severe_alerts_entity_ids', type: 'keyword' },
          { name: 'watchlisted_count', type: 'long' },
          { name: 'watchlisted_entity_ids', type: 'keyword' },
        ],
        [[null, [], null, []]]
      )
    );
    expect(result.severeAlertsCount).toBe(0);
    expect(result.watchlistedCount).toBe(0);
  });

  it('filters out null/empty strings from entity ID arrays', () => {
    const result = parseAlertBasedTilesResponse(
      makeResponse(
        [
          { name: 'severe_alerts_count', type: 'long' },
          { name: 'severe_alerts_entity_ids', type: 'keyword' },
          { name: 'watchlisted_count', type: 'long' },
          { name: 'watchlisted_entity_ids', type: 'keyword' },
        ],
        [[2, ['host:web01', null, '', 'user:alice@okta'], 0, []]]
      )
    );
    expect(result.severeAlertsEntityIds).toEqual(['host:web01', 'user:alice@okta']);
  });

  it('returns zeros when a column is missing from the response', () => {
    const result = parseAlertBasedTilesResponse(
      makeResponse([{ name: 'severe_alerts_count', type: 'long' }], [[10]])
    );
    expect(result.severeAlertsCount).toBe(10);
    expect(result.severeAlertsEntityIds).toEqual([]);
    expect(result.watchlistedCount).toBe(0);
    expect(result.watchlistedEntityIds).toEqual([]);
  });
});
