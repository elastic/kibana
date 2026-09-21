/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATASTREAM_DATASET,
  EVENT_MODULE,
  KUBELET_STATS_RECEIVER_OTEL,
  SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION,
} from '../../../constants';
import { pod } from '.';

describe('pod inventory model', () => {
  describe('nodeFilter', () => {
    it('returns no filter when schema is omitted', () => {
      expect(pod.nodeFilter?.()).toEqual([]);
    });

    it('filters kubernetes module documents for ecs', () => {
      expect(pod.nodeFilter?.({ schema: 'ecs' })).toEqual([
        { term: { [EVENT_MODULE]: 'kubernetes' } },
      ]);
    });

    it('filters kubeletstats dataset documents for semconv', () => {
      expect(pod.nodeFilter?.({ schema: 'semconv' })).toEqual([
        { term: { [DATASTREAM_DATASET]: KUBELET_STATS_RECEIVER_OTEL } },
      ]);
    });
  });

  describe('getAggregations', () => {
    it('resolves SemConv cpu fields and omits ECS kubernetes.pod.* names', async () => {
      const catalog = await pod.metrics.getAggregations({ schema: 'semconv' });
      const cpu = JSON.stringify(catalog.get('cpu'));

      expect(cpu).toContain(SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION);
      expect(cpu).not.toContain('kubernetes.pod.');
    });

    it('matches ecs aggregations when schema is omitted', async () => {
      const [withoutSchema, ecs] = await Promise.all([
        pod.metrics.getAggregations(),
        pod.metrics.getAggregations({ schema: 'ecs' }),
      ]);

      expect(withoutSchema.get('cpu')).toEqual(ecs.get('cpu'));
      expect(withoutSchema.get('memory')).toEqual(ecs.get('memory'));
      expect(withoutSchema.get('rx')).toEqual(ecs.get('rx'));
      expect(withoutSchema.get('tx')).toEqual(ecs.get('tx'));
    });

    it('filters receive traffic by direction and sums interfaces for SemConv rx', async () => {
      const catalog = await pod.metrics.getAggregations({ schema: 'semconv' });
      const rx = catalog.get('rx');

      expect(rx).toEqual(
        expect.objectContaining({
          rx_dimension: expect.objectContaining({
            filter: { term: { direction: 'receive' } },
            aggs: expect.objectContaining({
              rx_interfaces: expect.objectContaining({
                terms: expect.objectContaining({ field: 'interface' }),
              }),
            }),
          }),
        })
      );
    });

    it('filters transmit traffic by direction and sums interfaces for SemConv tx', async () => {
      const catalog = await pod.metrics.getAggregations({ schema: 'semconv' });
      const tx = catalog.get('tx');

      expect(tx).toEqual(
        expect.objectContaining({
          tx_dimension: expect.objectContaining({
            filter: { term: { direction: 'transmit' } },
            aggs: expect.objectContaining({
              tx_interfaces: expect.objectContaining({
                terms: expect.objectContaining({ field: 'interface' }),
              }),
            }),
          }),
        })
      );
    });
  });
});
