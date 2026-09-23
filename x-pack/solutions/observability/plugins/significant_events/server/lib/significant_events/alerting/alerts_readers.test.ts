/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import {
  RULES_BUCKET_SIZE,
  METRIC_SERIES_RUNTIME_MAPPINGS,
  buildChangePointHistogramWindow,
  buildChangePointTimeSeriesAggs,
} from './change_point_scan_shared';
import { ALERTS_READER_V2 } from './alerts_reader';

const SPACE_ID = 'default';
const RULE_UUID = 'rule-abc';
const LOOKBACK = 'now-40m';
const BUCKET_INTERVAL = '1m';

const makeQueryLink = (
  overrides: {
    rule_id?: string;
    stream_name?: string;
    title?: string;
    severity_score?: number;
  } = {}
): QueryLink => ({
  query: {
    id: 'q1',
    type: 'match',
    title: overrides.title ?? 'Test rule',
    description: 'desc',
    esql: { query: 'FROM logs | WHERE body.text:"error"' },
    severity_score: overrides.severity_score ?? 60,
  },
  stream_name: overrides.stream_name ?? 'logs.test',
  rule_backed: true,
  rule_id: overrides.rule_id ?? RULE_UUID,
});

function createEsClient() {
  const search = jest.fn();
  return {
    search,
    client: { search } as unknown as TracedElasticsearchClient,
  };
}

describe('SignificantEventsAlertsReaderV2', () => {
  const reader = ALERTS_READER_V2;

  it('scopes the occurrences ES|QL request and aggregates MAX then SUM via FIELD_EXTRACT', () => {
    const request = reader.buildOccurrencesEsqlRequest({
      ruleIds: [RULE_UUID],
      value: 5,
      esqlUnit: 'minutes',
      limit: 100,
      spaceId: SPACE_ID,
      rangeFromIso: '2026-01-01T00:00:00.000Z',
      rangeToIso: '2026-01-01T01:00:00.000Z',
    });

    expect(request.query).toContain('type == "signal"');
    expect(request.query).toContain(`space_id == "${SPACE_ID}"`);
    expect(request.query).toContain(`rule.id IN ("${RULE_UUID}")`);
    expect(request.query).toContain(
      'EVAL metric_value = TO_LONG(FIELD_EXTRACT(data, "metric_value"))'
    );
    expect(request.query).toContain(
      'EVAL bucket = TO_DATETIME(TO_LONG(FIELD_EXTRACT(data, "bucket")))'
    );
    expect(request.query).toContain(
      'bucket >= TO_DATETIME("2026-01-01T00:00:00.000Z") AND bucket <= TO_DATETIME("2026-01-01T01:00:00.000Z")'
    );
    expect(request.query).toContain('MAX(metric_value)');
    expect(request.query).toContain('SUM(minute_value)');
    expect(request.query).not.toContain('data.bucket');
    expect(request.query).not.toContain('COUNT_DISTINCT');
    expect(request.query).not.toContain('group_hash');
  });

  it('rejects occurrences requests that omit the source-bucket range', () => {
    expect(() =>
      reader.buildOccurrencesEsqlRequest({
        ruleIds: [RULE_UUID],
        value: 5,
        esqlUnit: 'minutes',
        limit: 100,
        spaceId: SPACE_ID,
      } as Parameters<typeof reader.buildOccurrencesEsqlRequest>[0])
    ).toThrow(/rangeFromIso and rangeToIso/);
  });

  it('counts alerts with terminate_after for the idle gate', async () => {
    const { client, search } = createEsClient();
    search.mockResolvedValue({ hits: { total: { value: 1 } } });

    const result = await reader.countAlerts(client, { lookback: LOOKBACK, spaceId: SPACE_ID });

    expect(result).toBe(1);
    expect(search).toHaveBeenCalledWith('significant_events_alerts_v2_count_alerts', {
      index: '.rule-events',
      ignore_unavailable: true,
      size: 0,
      track_total_hits: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [
            { term: { type: 'signal' } },
            { term: { space_id: SPACE_ID } },
            { range: { '@timestamp': { gte: LOOKBACK } } },
          ],
        },
      },
    });
  });

  it('scopes countAlerts to a single rule when ruleUuid is provided', async () => {
    const { client, search } = createEsClient();
    search.mockResolvedValue({ hits: { total: 0 } });

    await reader.countAlerts(client, {
      lookback: LOOKBACK,
      spaceId: SPACE_ID,
      ruleUuid: RULE_UUID,
    });

    expect(search).toHaveBeenCalledWith(
      'significant_events_alerts_v2_count_alerts',
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([{ term: { 'rule.id': RULE_UUID } }]),
          },
        },
      })
    );
  });

  it('normalizes change-point buckets with query link metadata', async () => {
    const { client, search } = createEsClient();
    search.mockResolvedValue({
      took: 17,
      aggregations: {
        by_rule: {
          buckets: [
            {
              key: RULE_UUID,
              doc_count: 100,
              change_points: { type: { mean_shift: { p_value: 0.02 } } },
            },
          ],
        },
      },
    });

    const result = await reader.runChangePointScan(
      client,
      { lookback: LOOKBACK, bucketInterval: BUCKET_INTERVAL, spaceId: SPACE_ID },
      [makeQueryLink({ title: 'Linked rule title' })]
    );

    const { hardBounds, seriesMax, writeTimeLookback } = buildChangePointHistogramWindow(
      LOOKBACK,
      BUCKET_INTERVAL
    );
    expect(search).toHaveBeenCalledWith(
      'significant_events_alerts_v2_change_point_scan',
      expect.objectContaining({
        index: '.rule-events',
        track_total_hits: false,
        runtime_mappings: METRIC_SERIES_RUNTIME_MAPPINGS,
        query: {
          bool: {
            filter: [
              { term: { type: 'signal' } },
              { term: { space_id: SPACE_ID } },
              { range: { '@timestamp': { gte: writeTimeLookback } } },
            ],
          },
        },
        aggs: {
          by_rule: {
            terms: { field: 'rule.id', size: RULES_BUCKET_SIZE },
            aggs: {
              ...buildChangePointTimeSeriesAggs({
                bucketInterval: BUCKET_INTERVAL,
                hardBounds,
                seriesMax,
              }),
            },
          },
        },
      })
    );
    expect(result.took).toBe(17);
    expect(result.by_rule.buckets).toEqual([
      {
        key: RULE_UUID,
        severity_score: 60,
        doc_count: 100,
        rule_name: {
          top: [{ metrics: { 'kibana.alert.rule.name': 'Linked rule title' } }],
        },
        stream: { buckets: [{ key: 'logs.test' }] },
        change_points: { type: { mean_shift: { p_value: 0.02 } } },
      },
    ]);
  });

  // A rule without history for the whole window gets a series under
  // change_point's floor. `indeterminable` must not reach the workflow, which
  // reads the single key of `change_points.type` and would write it as a
  // transition with a bogus p_value of 0.
  it('drops an indeterminable verdict to the empty type', async () => {
    const { client, search } = createEsClient();
    search.mockResolvedValue({
      aggregations: {
        by_rule: {
          buckets: [
            {
              key: RULE_UUID,
              doc_count: 66,
              change_points: {
                type: {
                  indeterminable: {
                    reason:
                      'not enough buckets to calculate change_point. Requires at least [22]; found [11]',
                  },
                },
              },
            },
          ],
        },
      },
    });

    const result = await reader.runChangePointScan(
      client,
      { lookback: LOOKBACK, bucketInterval: BUCKET_INTERVAL, spaceId: SPACE_ID },
      [makeQueryLink()]
    );

    expect(result.by_rule.buckets[0].change_points).toEqual({ type: {} });
  });
});
