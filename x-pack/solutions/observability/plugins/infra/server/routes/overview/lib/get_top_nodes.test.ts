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

const defaultOptions = { size: 5, sort: undefined, sortDirection: undefined };

describe('mergeTopNodesResponses', () => {
  it('returns empty series when all responses are empty', () => {
    const result = mergeTopNodesResponses([{ series: [] }, { series: [] }], defaultOptions);
    expect(result.series).toEqual([]);
  });

  it('merges hosts from different schemas and sorts by load (default)', () => {
    const ecsResponse: TopNodesResponse = {
      series: [makeSeries({ id: 'host-a', load: 3.0 }), makeSeries({ id: 'host-b', load: 1.0 })],
    };
    const semconvResponse: TopNodesResponse = {
      series: [makeSeries({ id: 'host-c', load: 2.0 }), makeSeries({ id: 'host-d', load: 0.5 })],
    };

    const result = mergeTopNodesResponses([ecsResponse, semconvResponse], defaultOptions);
    expect(result.series).toHaveLength(4);
    expect(result.series.map((s) => s.id)).toEqual(['host-d', 'host-b', 'host-c', 'host-a']);
  });

  it('sorts by cpu descending when requested', () => {
    const responses: TopNodesResponse[] = [
      { series: [makeSeries({ id: 'a', cpu: 0.1 }), makeSeries({ id: 'b', cpu: 0.9 })] },
      { series: [makeSeries({ id: 'c', cpu: 0.5 })] },
    ];

    const result = mergeTopNodesResponses(responses, {
      size: 5,
      sort: 'cpu',
      sortDirection: 'desc',
    });
    expect(result.series.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by name when requested', () => {
    const responses: TopNodesResponse[] = [
      { series: [makeSeries({ id: 'z-host', name: 'z-host' })] },
      { series: [makeSeries({ id: 'a-host', name: 'a-host' })] },
    ];

    const result = mergeTopNodesResponses(responses, { size: 5, sort: 'name' });
    expect(result.series.map((s) => s.id)).toEqual(['a-host', 'z-host']);
  });

  it('pushes null values to the end of sorted results', () => {
    const responses: TopNodesResponse[] = [
      {
        series: [makeSeries({ id: 'no-cpu', cpu: null }), makeSeries({ id: 'low-cpu', cpu: 0.1 })],
      },
    ];

    const result = mergeTopNodesResponses(responses, { size: 5, sort: 'cpu' });
    expect(result.series.map((s) => s.id)).toEqual(['low-cpu', 'no-cpu']);
  });

  it('deduplicates by host.name, keeping first occurrence (ECS first)', () => {
    const ecsResponse: TopNodesResponse = {
      series: [makeSeries({ id: 'shared-host', cpu: 0.3, uptime: 100000 })],
    };
    const semconvResponse: TopNodesResponse = {
      series: [makeSeries({ id: 'shared-host', cpu: 0.7, uptime: null })],
    };

    const result = mergeTopNodesResponses([ecsResponse, semconvResponse], defaultOptions);
    expect(result.series).toHaveLength(1);
    expect(result.series[0].cpu).toBe(0.3);
    expect(result.series[0].uptime).toBe(100000);
  });

  it('trims results to the requested size', () => {
    const response: TopNodesResponse = {
      series: Array.from({ length: 10 }, (_, i) => makeSeries({ id: `host-${i}`, load: i * 0.1 })),
    };

    const result = mergeTopNodesResponses([response], { ...defaultOptions, size: 3 });
    expect(result.series).toHaveLength(3);
  });

  it('handles a single response and re-sorts', () => {
    const response: TopNodesResponse = {
      series: [makeSeries({ id: 'host-b', load: 2.0 }), makeSeries({ id: 'host-a', load: 1.0 })],
    };

    const result = mergeTopNodesResponses([response], defaultOptions);
    expect(result.series).toHaveLength(2);
    expect(result.series.map((s) => s.id)).toEqual(['host-a', 'host-b']);
  });
});
