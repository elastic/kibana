/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ECS_CONTAINER_CPU_USAGE_LIMIT_PCT,
  ECS_CONTAINER_MEMORY_USAGE_BYTES,
  SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION,
  SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT,
  SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION,
  SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION,
} from '../shared/constants';
import { getOptionsForSchema } from './container_metrics_configs';

describe('container_metrics_configs', () => {
  describe('getOptionsForSchema', () => {
    it('returns ECS options when isOtel is false', () => {
      const { options } = getOptionsForSchema(false);

      expect(options.groupBy).toBe('container.id');
      expect(options.kuery).toBe(`event.dataset: "kubernetes.container"`);
      expect(options.metrics).toEqual(
        expect.arrayContaining([
          { field: ECS_CONTAINER_CPU_USAGE_LIMIT_PCT, aggregation: 'avg' },
          { field: ECS_CONTAINER_MEMORY_USAGE_BYTES, aggregation: 'avg' },
        ])
      );
      expect(options.metrics).toHaveLength(2);
    });

    it('returns SemConv Docker options when isOtel is true and isK8sContainer is false', () => {
      const { options } = getOptionsForSchema(true, false);

      expect(options.groupBy).toBe('container.id');
      expect(options.kuery).toBe('event.dataset: "dockerstatsreceiver.otel"');
      expect(options.metrics).toEqual(
        expect.arrayContaining([
          { field: SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION, aggregation: 'avg' },
          { field: SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT, aggregation: 'avg' },
        ])
      );
      expect(options.metrics).toHaveLength(2);
    });

    it('returns SemConv Docker options when isOtel is true and isK8sContainer is undefined', () => {
      const { options } = getOptionsForSchema(true);

      expect(options.groupBy).toBe('container.id');
      expect(options.kuery).toBe('event.dataset: "dockerstatsreceiver.otel"');
      expect(options.metrics).toEqual(
        expect.arrayContaining([
          { field: SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION, aggregation: 'avg' },
          { field: SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT, aggregation: 'avg' },
        ])
      );
      expect(options.metrics).toHaveLength(2);
    });

    it('returns SemConv K8s options when isOtel is true and isK8sContainer is true', () => {
      const { options } = getOptionsForSchema(true, true);

      expect(options.groupBy).toBe('container.id');
      expect(options.kuery).toBe('event.dataset: "kubeletstatsreceiver.otel"');
      expect(options.metrics).toEqual(
        expect.arrayContaining([
          { field: SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION, aggregation: 'avg' },
          { field: SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION, aggregation: 'avg' },
        ])
      );
      expect(options.metrics).toHaveLength(2);
    });

    it('combines kuery with ECS source filter when isOtel is false and kuery is provided', () => {
      const kuery = 'container.id: "abc-123"';
      const { options } = getOptionsForSchema(false, undefined, kuery);

      expect(options.kuery).toBe(`event.dataset: "kubernetes.container" AND (${kuery})`);
    });

    it('combines kuery with SemConv Docker when isOtel is true, isK8sContainer false, and kuery is provided', () => {
      const kuery = 'container.id: "abc-123"';
      const { options } = getOptionsForSchema(true, false, kuery);

      expect(options.kuery).toBe(`event.dataset: "dockerstatsreceiver.otel" AND (${kuery})`);
    });

    it('combines kuery with SemConv K8s when isOtel is true, isK8sContainer true, and kuery is provided', () => {
      const kuery = 'container.id: "abc-123"';
      const { options } = getOptionsForSchema(true, true, kuery);

      expect(options.kuery).toBe(`event.dataset: "kubeletstatsreceiver.otel" AND (${kuery})`);
    });
  });
});
