/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsCatalog } from './metrics_catalog';
import { type MetricConfigMap } from './types';

describe('MetricsCatalog', () => {
  const aggregationsPerSchema = {
    cpu: {
      ecs: {
        cpuAgg: {
          avg: {
            field: 'field.ecs',
          },
        },
      },
      semconv: {
        cpuIdleAgg: {
          terms: {
            field: 'field.dimension',
            include: ['wait', 'idle'],
          },
          aggs: {
            avg: {
              avg: {
                field: 'field.semconv',
              },
            },
          },
        },
        cpuTotalAgg: {
          sum_bucket: {
            buckets_path: 'cpuIdleAgg.avg',
          },
        },
        cpuAgg: {
          bucket_script: {
            buckets_path: {
              cpuIdleTotal: 'cpuTotalAgg',
            },
            script: '1 - params.cpuIdleTotal',
          },
        },
      },
    },
    memory: {
      ecs: { memoryAgg: { avg: 'field.ecs' } },
      semconv: { memoryAgg: { avg: 'field.semconv' } },
    },
  } satisfies MetricConfigMap;

  const aggregations = {
    cpu: { cpuAgg: { avg: { field: 'field.ecs' } } },
    memory: { memoryAgg: { avg: { field: 'field.ecs' } } },
  } satisfies MetricConfigMap;

  const formulasPerSchema = {
    cpu: { value: { ecs: 'avg(field.ecs)', semconv: 'avg(field.semconv)' } },
    memory: { value: { ecs: 'avg(field.ecs)', semconv: 'avg(field.semconv)' } },
  } satisfies MetricConfigMap;

  const formulas = {
    cpu: { value: 'avg(field.ecs)' },
    memory: { value: 'avg(field.ecs)' },
  } satisfies MetricConfigMap;

  describe('Schema variation', () => {
    describe('ecs', () => {
      it('should resolve formulas', () => {
        const catalog = new MetricsCatalog(formulasPerSchema, 'ecs');

        expect(catalog.get('cpu')).toEqual({ value: 'avg(field.ecs)' });
        expect(catalog.get('memory')).toEqual({ value: 'avg(field.ecs)' });
      });

      it('should resolve aggregations', () => {
        const catalog = new MetricsCatalog(aggregationsPerSchema, 'ecs');

        expect(catalog.get('cpu')).toEqual({ cpuAgg: { avg: { field: 'field.ecs' } } });
        expect(catalog.get('memory')).toEqual({ memoryAgg: { avg: 'field.ecs' } });
      });

      it('should get all formulas', () => {
        const catalog = new MetricsCatalog(formulasPerSchema, 'ecs');
        const allMetrics = catalog.getAll();

        expect(allMetrics).toEqual({
          cpu: { value: 'avg(field.ecs)' },
          memory: { value: 'avg(field.ecs)' },
        });
      });

      it('should get all aggregations', () => {
        const catalog = new MetricsCatalog(aggregationsPerSchema, 'ecs');
        const allMetrics = catalog.getAll();

        expect(allMetrics).toEqual({
          cpu: { cpuAgg: { avg: { field: 'field.ecs' } } },
          memory: { memoryAgg: { avg: 'field.ecs' } },
        });
      });
    });

    describe('semconv', () => {
      it('should resolve formulas', () => {
        const catalog = new MetricsCatalog(formulasPerSchema, 'semconv');

        expect(catalog.get('cpu')).toEqual({ value: 'avg(field.semconv)' });
        expect(catalog.get('memory')).toEqual({ value: 'avg(field.semconv)' });
      });

      it('should resolve aggregations', () => {
        const catalog = new MetricsCatalog(aggregationsPerSchema, 'semconv');

        expect(catalog.get('cpu')).toEqual({
          cpuAgg: {
            bucket_script: {
              buckets_path: {
                cpuIdleTotal: 'cpuTotalAgg',
              },
              script: '1 - params.cpuIdleTotal',
            },
          },
          cpuIdleAgg: {
            aggs: {
              avg: {
                avg: {
                  field: 'field.semconv',
                },
              },
            },
            terms: {
              field: 'field.dimension',
              include: ['wait', 'idle'],
            },
          },
          cpuTotalAgg: {
            sum_bucket: {
              buckets_path: 'cpuIdleAgg.avg',
            },
          },
        });

        expect(catalog.get('memory')).toEqual({
          memoryAgg: { avg: 'field.semconv' },
        });
      });

      it('should get all formulas', () => {
        const catalog = new MetricsCatalog(formulasPerSchema, 'semconv');
        const allMetrics = catalog.getAll();

        expect(allMetrics).toEqual({
          cpu: { value: 'avg(field.semconv)' },
          memory: { value: 'avg(field.semconv)' },
        });
      });

      it('should get all aggregations', () => {
        const catalog = new MetricsCatalog(aggregationsPerSchema, 'semconv');
        const allMetrics = catalog.getAll();

        expect(allMetrics).toEqual({
          cpu: {
            cpuAgg: {
              bucket_script: {
                buckets_path: {
                  cpuIdleTotal: 'cpuTotalAgg',
                },
                script: '1 - params.cpuIdleTotal',
              },
            },
            cpuIdleAgg: {
              aggs: {
                avg: {
                  avg: {
                    field: 'field.semconv',
                  },
                },
              },
              terms: {
                field: 'field.dimension',
                include: ['wait', 'idle'],
              },
            },
            cpuTotalAgg: {
              sum_bucket: {
                buckets_path: 'cpuIdleAgg.avg',
              },
            },
          },
          memory: { memoryAgg: { avg: 'field.semconv' } },
        });
      });
    });
  });

  describe('Without schema variation', () => {
    it('should resolve aggregations', () => {
      const catalog = new MetricsCatalog(aggregations);
      expect(catalog.get('cpu')).toEqual({ cpuAgg: { avg: { field: 'field.ecs' } } });
      expect(catalog.get('memory')).toEqual({ memoryAgg: { avg: { field: 'field.ecs' } } });
    });

    it('should resolve formulas', () => {
      const catalog = new MetricsCatalog(formulas);
      expect(catalog.get('cpu')).toEqual({ value: 'avg(field.ecs)' });
      expect(catalog.get('memory')).toEqual({ value: 'avg(field.ecs)' });
    });

    it('should get all aggregations', () => {
      const catalog = new MetricsCatalog(aggregationsPerSchema);
      const allMetrics = catalog.getAll();

      expect(allMetrics).toEqual({
        cpu: { cpuAgg: { avg: { field: 'field.ecs' } } },
        memory: { memoryAgg: { avg: 'field.ecs' } },
      });
    });

    it('should get all formulas', () => {
      const catalog = new MetricsCatalog(formulasPerSchema);
      const allMetrics = catalog.getAll();

      expect(allMetrics).toEqual({
        cpu: { value: 'avg(field.ecs)' },
        memory: { value: 'avg(field.ecs)' },
      });
    });
  });
});
