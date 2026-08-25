/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraDatabaseSearchResponse } from '../../../lib/adapters/framework';
import type { ESResponseForTopNodes, NodeBucket } from './types';
import { convertESResponseToTopNodesResponse } from './convert_es_response_to_top_nodes_response';

const makeNodeBucket = (overrides: Partial<NodeBucket> & { key: string }): NodeBucket => ({
  doc_count: 100,
  metadata: {
    top: [
      {
        sort: ['2024-01-01T00:00:00.000Z'],
        metrics: {
          'host.name': overrides.key,
          'host.os.platform': 'linux',
          'cloud.provider': 'aws',
        },
      },
    ],
  },
  cpu: { value: 0.5 },
  load: { value: 2.0 },
  timeseries: { buckets: [] },
  ...overrides,
});

describe('convertESResponseToTopNodesResponse', () => {
  it('returns empty series when no aggregations exist', () => {
    const response = { aggregations: undefined } as unknown as InfraDatabaseSearchResponse<
      {},
      ESResponseForTopNodes
    >;
    expect(convertESResponseToTopNodesResponse(response)).toEqual({ series: [] });
  });

  it('converts a full ECS response with all metrics', () => {
    const node = makeNodeBucket({
      key: 'host-a',
      uptime: { value: 123456 },
      iowait: { value: 0.02 },
      rx: { bytes: { value: 1024 } } as any,
      tx: { bytes: { value: 2048 } } as any,
    });

    const response = {
      aggregations: { nodes: { buckets: [node] } },
    } as unknown as InfraDatabaseSearchResponse<{}, ESResponseForTopNodes>;

    const result = convertESResponseToTopNodesResponse(response);
    expect(result.series).toHaveLength(1);
    expect(result.series[0]).toMatchObject({
      id: 'host-a',
      cpu: 0.5,
      load: 2.0,
      uptime: 123456,
      iowait: 0.02,
      rx: 1024,
      tx: 2048,
    });
  });

  it('handles semconv response with missing optional metrics', () => {
    const node = makeNodeBucket({
      key: 'otel-host',
    });

    const response = {
      aggregations: { nodes: { buckets: [node] } },
    } as unknown as InfraDatabaseSearchResponse<{}, ESResponseForTopNodes>;

    const result = convertESResponseToTopNodesResponse(response);
    expect(result.series).toHaveLength(1);
    expect(result.series[0]).toMatchObject({
      id: 'otel-host',
      cpu: 0.5,
      load: 2.0,
      uptime: null,
      iowait: null,
      rx: null,
      tx: null,
    });
  });

  it('handles response with all metrics missing (including load)', () => {
    const node: NodeBucket = {
      key: 'empty-host',
      doc_count: 0,
      metadata: {
        top: [
          {
            sort: ['2024-01-01T00:00:00.000Z'],
            metrics: {
              'host.name': 'empty-host',
              'host.os.platform': null,
              'cloud.provider': null,
            },
          },
        ],
      },
      timeseries: { buckets: [] },
    };

    const response = {
      aggregations: { nodes: { buckets: [node] } },
    } as unknown as InfraDatabaseSearchResponse<{}, ESResponseForTopNodes>;

    const result = convertESResponseToTopNodesResponse(response);
    expect(result.series[0]).toMatchObject({
      id: 'empty-host',
      cpu: null,
      load: null,
      uptime: null,
      iowait: null,
      rx: null,
      tx: null,
    });
  });

  it('handles timeseries buckets with missing optional metrics', () => {
    const node = makeNodeBucket({
      key: 'otel-host',
      timeseries: {
        buckets: [
          {
            key: 1704067200000,
            key_as_string: '2024-01-01T00:00:00.000Z',
            doc_count: 10,
            cpu: { value: 0.4 },
            load: { value: 1.5 },
          } as any,
        ],
      },
    });

    const response = {
      aggregations: { nodes: { buckets: [node] } },
    } as unknown as InfraDatabaseSearchResponse<{}, ESResponseForTopNodes>;

    const result = convertESResponseToTopNodesResponse(response);
    const ts = result.series[0].timeseries[0];
    expect(ts.cpu).toBe(0.4);
    expect(ts.load).toBe(1.5);
    expect(ts.iowait).toBeNull();
    expect(ts.rx).toBeNull();
    expect(ts.tx).toBeNull();
  });
});
