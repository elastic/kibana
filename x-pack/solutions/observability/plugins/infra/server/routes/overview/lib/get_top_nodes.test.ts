/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TopNodesResponse } from '../../../../common/http_api/overview_api';
import { mergeTopNodesResponses } from './get_top_nodes';

const makeSeries = (
  overrides: Partial<TopNodesResponse['series'][number]> & { id: string }
): TopNodesResponse['series'][number] => ({
  name: overrides.id,
  platform: 'linux',
  provider: null,
  cpu: 0.5,
  iowait: null,
  load: 1.0,
  uptime: null,
  rx: null,
  tx: null,
  timeseries: [],
  ...overrides,
});

describe('mergeTopNodesResponses', () => {
  it('returns empty series when all responses are empty', () => {
    const result = mergeTopNodesResponses([{ series: [] }, { series: [] }], 5);
    expect(result.series).toEqual([]);
  });

  it('merges hosts from different schemas without duplicates', () => {
    const ecsResponse: TopNodesResponse = {
      series: [
        makeSeries({ id: 'host-a', cpu: 0.3, uptime: 100000 }),
        makeSeries({ id: 'host-b', cpu: 0.5, uptime: 200000 }),
      ],
    };
    const semconvResponse: TopNodesResponse = {
      series: [
        makeSeries({ id: 'host-c', cpu: 0.7, uptime: null }),
        makeSeries({ id: 'host-d', cpu: 0.9, uptime: null }),
      ],
    };

    const result = mergeTopNodesResponses([ecsResponse, semconvResponse], 5);
    expect(result.series).toHaveLength(4);
    expect(result.series.map((s) => s.id)).toEqual(['host-a', 'host-b', 'host-c', 'host-d']);
  });

  it('deduplicates by host.name, keeping first occurrence (ECS first)', () => {
    const ecsResponse: TopNodesResponse = {
      series: [makeSeries({ id: 'shared-host', cpu: 0.3, uptime: 100000 })],
    };
    const semconvResponse: TopNodesResponse = {
      series: [makeSeries({ id: 'shared-host', cpu: 0.7, uptime: null })],
    };

    const result = mergeTopNodesResponses([ecsResponse, semconvResponse], 5);
    expect(result.series).toHaveLength(1);
    expect(result.series[0].cpu).toBe(0.3);
    expect(result.series[0].uptime).toBe(100000);
  });

  it('trims results to the requested size', () => {
    const response: TopNodesResponse = {
      series: Array.from({ length: 10 }, (_, i) => makeSeries({ id: `host-${i}` })),
    };

    const result = mergeTopNodesResponses([response], 3);
    expect(result.series).toHaveLength(3);
  });

  it('handles a single response without modification', () => {
    const response: TopNodesResponse = {
      series: [makeSeries({ id: 'host-a' }), makeSeries({ id: 'host-b' })],
    };

    const result = mergeTopNodesResponses([response], 5);
    expect(result.series).toHaveLength(2);
    expect(result.series.map((s) => s.id)).toEqual(['host-a', 'host-b']);
  });
});
