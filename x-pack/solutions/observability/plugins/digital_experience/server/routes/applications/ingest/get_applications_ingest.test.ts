/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { HistogramBuckets } from '../../../../common/types/applications';
import type { IndexSize } from './estimate';
import type { IngestSource, OverTimeBucket } from './get_applications_ingest';
import { TOP_APPLICATIONS, getApplicationsIngest } from './get_applications_ingest';

const LOGS = '.ds-logs-browser.otel-default-2026.11.24-000001';
const TRACES = '.ds-traces-browser.otel-default-2026.11.24-000001';
const MOBILE_LOGS = '.ds-logs-android.otel-default-2026.11.24-000001';

const histogram: HistogramBuckets = { interval: { value: 3600, unit: 's' }, start: 0, end: 7200 };

// 100 bytes per log, 200 per span, 50 per mobile log.
const SIZES = new Map<string, IndexSize>([
  [LOGS, { bytes: 1000, docs: 10 }],
  [TRACES, { bytes: 2000, docs: 10 }],
  [MOBILE_LOGS, { bytes: 500, docs: 10 }],
]);

const getIndexSizes = jest.fn(async (indices: Iterable<string>) => ({
  sizes: new Map(
    [...indices].flatMap((index) => {
      const size = SIZES.get(index);
      return size ? [[index, size] as const] : [];
    })
  ),
  missingPrivileges: false,
}));

const otelSource = (overrides: Partial<IngestSource> = {}): IngestSource => ({
  source: 'otel',
  applicationType: 'web',
  getCounts: async () => [
    {
      serviceName: 'shop',
      indices: [
        { index: LOGS, docs: 4 },
        { index: TRACES, docs: 1 },
      ],
    },
    { serviceName: 'docs', indices: [{ index: LOGS, docs: 1 }] },
  ],
  getOverTime: async (serviceNames): Promise<OverTimeBucket[]> => [
    {
      timestamp: 0,
      indices: [
        { index: LOGS, docs: 5 },
        { index: TRACES, docs: 1 },
      ],
      applications: serviceNames.includes('shop')
        ? [{ serviceName: 'shop', indices: [{ index: LOGS, docs: 2 }] }]
        : [],
    },
    { timestamp: 3600, indices: [], applications: [] },
  ],
  ...overrides,
});

const mobile: IngestSource = {
  source: 'otel',
  applicationType: 'mobile',
  getCounts: async () => [{ serviceName: 'app', indices: [{ index: MOBILE_LOGS, docs: 3 }] }],
};

const run = (sources: IngestSource[]) =>
  getApplicationsIngest({
    sources,
    getIndexSizes,
    histogram,
    logger: loggingSystemMock.createLogger(),
  });

describe('getApplicationsIngest', () => {
  beforeEach(() => getIndexSizes.mockClear());

  it("estimates each application from its documents and their data streams' average size", async () => {
    const { applications, missingPrivileges, hasFailures } = await run([otelSource(), mobile]);

    expect(applications).toEqual([
      { serviceName: 'shop', applicationType: 'web', source: 'otel', bytes: 4 * 100 + 200 },
      { serviceName: 'docs', applicationType: 'web', source: 'otel', bytes: 100 },
      { serviceName: 'app', applicationType: 'mobile', source: 'otel', bytes: 150 },
    ]);
    expect(missingPrivileges).toBe(false);
    expect(hasFailures).toBe(false);
  });

  it('reads the sizes of every index of every source in one call', async () => {
    await run([otelSource(), mobile]);

    expect(getIndexSizes).toHaveBeenCalledTimes(1);
    expect(new Set(getIndexSizes.mock.calls[0][0])).toEqual(new Set([LOGS, TRACES, MOBILE_LOGS]));
  });

  it("charts the top applications and the rest of the web source's ingest as other", async () => {
    const { overTime } = await run([otelSource(), mobile]);

    expect(overTime.histogram).toBe(histogram);
    expect(overTime.series).toEqual([
      {
        serviceName: 'shop',
        source: 'otel',
        points: [
          { timestamp: 0, bytes: 200 },
          { timestamp: 3600, bytes: 0 },
        ],
      },
      {
        serviceName: 'docs',
        source: 'otel',
        points: [
          { timestamp: 0, bytes: 0 },
          { timestamp: 3600, bytes: 0 },
        ],
      },
    ]);
    // 5 logs and 1 span in all, less the 2 logs of `shop`.
    expect(overTime.other).toEqual({
      otel: [
        { timestamp: 0, bytes: 500 + 200 - 200 },
        { timestamp: 3600, bytes: 0 },
      ],
      classic: [],
    });
  });

  it(`asks for the buckets of the ${TOP_APPLICATIONS} applications with the most ingest`, async () => {
    const getOverTime = jest.fn(async () => []);
    await run([
      otelSource({
        getCounts: async () =>
          Array.from({ length: TOP_APPLICATIONS + 2 }, (_, rank) => ({
            serviceName: `app-${rank}`,
            indices: [{ index: LOGS, docs: rank + 1 }],
          })),
        getOverTime,
      }),
    ]);

    expect(getOverTime).toHaveBeenCalledWith(
      Array.from({ length: TOP_APPLICATIONS }, (_, rank) => `app-${TOP_APPLICATIONS + 1 - rank}`)
    );
  });

  it('has no other ingest, not a rounding error, when the top applications are all of it', async () => {
    // 1/3 byte per document, so each application's bytes round down.
    getIndexSizes.mockResolvedValueOnce({
      sizes: new Map([[LOGS, { bytes: 1, docs: 3 }]]),
      missingPrivileges: false,
    });
    const counts = ['a', 'b', 'c'].map((serviceName) => ({
      serviceName,
      indices: [{ index: LOGS, docs: 1 }],
    }));
    const { overTime } = await run([
      otelSource({
        getCounts: async () => counts,
        getOverTime: async () => [
          { timestamp: 0, indices: [{ index: LOGS, docs: 3 }], applications: counts },
        ],
      }),
    ]);

    expect(overTime.other.otel).toEqual([{ timestamp: 0, bytes: 0 }]);
  });

  it('leaves out the applications of a failed source, and says so', async () => {
    const { applications, hasFailures } = await run([
      otelSource({ getCounts: () => Promise.reject(new Error('boom')) }),
      mobile,
    ]);

    expect(applications.map(({ serviceName }) => serviceName)).toEqual(['app']);
    expect(hasFailures).toBe(true);
  });

  it('keeps the totals when the buckets fail', async () => {
    const { applications, overTime, hasFailures } = await run([
      otelSource({ getOverTime: () => Promise.reject(new Error('boom')) }),
    ]);

    expect(applications).toHaveLength(2);
    expect(overTime.series).toEqual([]);
    expect(hasFailures).toBe(true);
  });

  it('fails when every source fails', async () => {
    await expect(
      run([otelSource({ getCounts: () => Promise.reject(new Error('boom')) })])
    ).rejects.toThrow('boom');
  });

  it('has no estimate for documents whose sizes the user may not read', async () => {
    getIndexSizes.mockResolvedValueOnce({ sizes: new Map(), missingPrivileges: true });
    const { applications, missingPrivileges } = await run([otelSource()]);

    expect(applications).toEqual([]);
    expect(missingPrivileges).toBe(true);
  });
});
