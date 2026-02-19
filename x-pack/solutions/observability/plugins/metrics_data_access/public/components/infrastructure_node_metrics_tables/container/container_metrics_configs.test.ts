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

      const filterClauseDsl = {
        bool: {
          filter: [{ term: { 'event.dataset': 'kubernetes.container' } }],
        },
      };

      expect(options.groupBy).toBe('container.id');
      expect(options.filterQuery).toBe(JSON.stringify(filterClauseDsl));
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
      const filterClauseDsl = {
        bool: {
          filter: [{ term: { 'event.dataset': 'dockerstatsreceiver.otel' } }],
        },
      };

      expect(options.groupBy).toBe('container.id');
      expect(options.filterQuery).toBe(JSON.stringify(filterClauseDsl));
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
      const filterClauseDsl = {
        bool: {
          filter: [{ term: { 'event.dataset': 'dockerstatsreceiver.otel' } }],
        },
      };
      expect(options.groupBy).toBe('container.id');
      expect(options.filterQuery).toBe(JSON.stringify(filterClauseDsl));
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
      const filterClauseDsl = {
        bool: {
          filter: [{ term: { 'event.dataset': 'kubeletstatsreceiver.otel' } }],
        },
      };
      expect(options.groupBy).toBe('container.id');
      expect(options.filterQuery).toBe(JSON.stringify(filterClauseDsl));
      expect(options.metrics).toEqual(
        expect.arrayContaining([
          { field: SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION, aggregation: 'avg' },
          { field: SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION, aggregation: 'avg' },
        ])
      );
      expect(options.metrics).toHaveLength(2);
    });

    it('combines kuery with ECS source filter when isOtel is false and kuery is provided', () => {
      const filterClauseDsl = {
        bool: {
          filter: [{ term: { 'container.id': 'abc-123' } }],
        },
      }

      const filterClauseWithEventModuleFilter = {
        bool: {
          filter: [{ term: { 'event.dataset': 'kubernetes.container' } }, { ...filterClauseDsl }],
        },
      };

      const { options } = getOptionsForSchema(false, undefined, filterClauseDsl);

      expect(options.filterQuery).toBe(JSON.stringify(filterClauseWithEventModuleFilter));
    });

    it('combines kuery with SemConv Docker when isOtel is true, isK8sContainer false, and kuery is provided', () => {
      const filterClauseDsl = {
        bool: {
          filter: [{ term: { 'container.id': 'abc-123' } }],
        },
      }

      const filterClauseWithEventModuleFilter = {
        bool: {
          filter: [{ term: { 'event.dataset': 'dockerstatsreceiver.otel' } }, { ...filterClauseDsl }],
        },
      };

      const { options } = getOptionsForSchema(true, false, filterClauseDsl);

      expect(options.filterQuery).toBe(JSON.stringify(filterClauseWithEventModuleFilter));
    });

    it('combines kuery with SemConv K8s when isOtel is true, isK8sContainer true, and kuery is provided', () => {
      const filterClauseDsl = {
        bool: {
          filter: [{ term: { 'container.id': 'abc-123' } }],
        },
      };
      const filterClauseWithEventModuleFilter = {
        bool: {
          filter: [{ term: { 'event.dataset': 'kubeletstatsreceiver.otel' } }, { ...filterClauseDsl }],
        },
      };
      
      const { options } = getOptionsForSchema(true, true, filterClauseDsl);

      expect(options.filterQuery).toBe(JSON.stringify(filterClauseWithEventModuleFilter));
    });
  });
});
