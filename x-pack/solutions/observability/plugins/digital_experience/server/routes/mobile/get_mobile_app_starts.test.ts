/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTracedEsClientMock,
  esqlResponse,
} from '../../lib/create_digital_experience_traced_es_client.test_helpers';
import { getMobileAppStarts } from './get_mobile_app_starts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const START = 40 * DAY;
const END = START + 3 * HOUR;

const setup = ({
  rows = [],
  buckets = [],
}: {
  rows?: Array<Record<string, unknown>>;
  buckets?: number[];
}) => {
  const { client, esClient } = createTracedEsClientMock();
  client.esql.query.mockResolvedValue(esqlResponse(rows) as never);
  client.search.mockResolvedValue({
    aggregations: { buckets: { buckets: buckets.map((key) => ({ key, doc_count: 0 })) } },
  } as never);
  const run = () =>
    getMobileAppStarts({
      esClient,
      filters: { serviceName: 'shop-mobile', osName: 'iOS', release: '2.0.0' },
      start: START,
      end: END,
      environment: 'production',
      timeZone: 'Europe/Madrid',
    });
  return { client, run };
};

const bucket = (timestamp: number) => new Date(timestamp).toISOString();

describe('getMobileAppStarts', () => {
  it('has no points without app starts, and searches no empty buckets', async () => {
    const { client, run } = setup({ buckets: [START, START + HOUR] });

    expect((await run()).points).toEqual([]);
    expect(client.search).not.toHaveBeenCalled();
  });

  it('gives every bucket its cold and warm average and count, a gap where there were none', async () => {
    const { run } = setup({
      rows: [
        {
          bucket: bucket(START),
          cold_start: 1800,
          cold_starts: 42,
          warm_start: 350,
          warm_starts: 7,
        },
        // Only cold starts in the bucket: ES|QL leaves the warm average null
        { bucket: bucket(START + 2 * HOUR), cold_start: 2100, cold_starts: 3, warm_starts: 0 },
      ],
      buckets: [START, START + HOUR, START + 2 * HOUR],
    });

    const { points } = await run();

    expect(points).toEqual([
      {
        timestamp: START,
        cold: { avg: 1800, count: 42 },
        warm: { avg: 350, count: 7 },
      },
      {
        timestamp: START + HOUR,
        cold: { avg: null, count: 0 },
        warm: { avg: null, count: 0 },
      },
      {
        timestamp: START + 2 * HOUR,
        cold: { avg: 2100, count: 3 },
        warm: { avg: null, count: 0 },
      },
    ]);
  });

  it('reads the app starts of the filters, in the time zone, over the range', async () => {
    const { client, run } = setup({
      rows: [{ bucket: bucket(START), cold_start: 1800, cold_starts: 1, warm_starts: 0 }],
    });

    await run();

    const [[request]] = client.esql.query.mock.calls;
    expect(request.query).toContain('WHERE event_name == "elastic.app.start"');
    expect(request.query).toContain('TBUCKET(');
    expect(request.time_zone).toBe('Europe/Madrid');
    expect(request.params).toEqual([
      { service_name: 'shop-mobile' },
      { os_name: 'iOS' },
      { release: '2.0.0' },
    ]);
    // The empty buckets come from a date histogram in the same time zone
    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: {
          buckets: {
            date_histogram: expect.objectContaining({ time_zone: 'Europe/Madrid' }),
          },
        },
      }),
      expect.anything()
    );
  });
});
