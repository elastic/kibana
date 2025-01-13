/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import { SLODefinition } from '../../domain/models';
import { twoMinute } from '../fixtures/duration';
import { createSLO, createSyntheticsAvailabilityIndicator } from '../fixtures/slo';
import { SyntheticsAvailabilityTransformGenerator } from './synthetics_availability';

const SPACE_ID = 'custom-space';

describe('Synthetics Availability Transform Generator', () => {
  describe('when serverless is disabled', () => {
    const generator = new SyntheticsAvailabilityTransformGenerator(
      SPACE_ID,
      dataViewsService,
      false
    );

    it('returns the expected transform params', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createSyntheticsAvailabilityIndicator(),
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform).toMatchSnapshot();
      expect(transform.source.query?.bool?.filter).toContainEqual({
        term: {
          'summary.final_attempt': true,
        },
      });
    });

    it('groups by config id and observer.name when using default groupings', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createSyntheticsAvailabilityIndicator(),
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform.pivot?.group_by).toEqual(
        expect.objectContaining({
          'monitor.config_id': {
            terms: {
              field: 'config_id',
            },
          },
          'observer.name': {
            terms: {
              field: 'observer.name',
            },
          },
        })
      );
    });

    it('does not include config id and observer.name when using non default groupings', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createSyntheticsAvailabilityIndicator(),
        groupBy: ['host.name'],
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform.pivot?.group_by).not.toEqual(
        expect.objectContaining({
          'monitor.config_id': {
            terms: {
              field: 'config_id',
            },
          },
          'observer.name': {
            terms: {
              field: 'observer.name',
            },
          },
        })
      );

      expect(transform.pivot?.group_by).toEqual(
        expect.objectContaining({
          'slo.groupings.host.name': {
            terms: {
              field: 'host.name',
            },
          },
        })
      );
    });

    it.each([[[]], [[ALL_VALUE]]])(
      'adds observer.geo.name and monitor.name to groupings key by default, multi group by',
      async (groupBy) => {
        const slo = createSLO({
          id: 'irrelevant',
          indicator: createSyntheticsAvailabilityIndicator(),
          groupBy,
        });
        const transform = await generator.getTransformParams(slo);

        expect(transform.pivot?.group_by).toEqual(
          expect.objectContaining({
            'slo.groupings.monitor.name': {
              terms: {
                field: 'monitor.name',
              },
            },
            'slo.groupings.observer.geo.name': {
              terms: {
                field: 'observer.geo.name',
              },
            },
          })
        );
      }
    );

    it.each([[''], [ALL_VALUE]])(
      'adds observer.geo.name and monitor.name to groupings key by default, single group by',
      async (groupBy) => {
        const slo = createSLO({
          id: 'irrelevant',
          indicator: createSyntheticsAvailabilityIndicator(),
          groupBy,
        });
        const transform = await generator.getTransformParams(slo);

        expect(transform.pivot?.group_by).toEqual(
          expect.objectContaining({
            'slo.groupings.monitor.name': {
              terms: {
                field: 'monitor.name',
              },
            },
            'slo.groupings.observer.geo.name': {
              terms: {
                field: 'observer.geo.name',
              },
            },
          })
        );
      }
    );

    it.each([[['host.name']], [['host.name', 'host.region']]])(
      'handles custom groupBy',
      async (groupBy) => {
        const slo = createSLO({
          id: 'irrelevant',
          indicator: createSyntheticsAvailabilityIndicator(),
          groupBy,
        });
        const transform = await generator.getTransformParams(slo);

        expect(transform.pivot?.group_by).toEqual(
          expect.objectContaining({
            'slo.groupings.host.name': {
              terms: {
                field: 'host.name',
              },
            },
          })
        );
      }
    );

    it('filters by summary.final_attempt', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createSyntheticsAvailabilityIndicator(),
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform.source.query?.bool?.filter).toContainEqual({
        term: {
          'summary.final_attempt': true,
        },
      });
    });

    it('adds tag filters', async () => {
      const tags = [
        { value: 'tag-1', label: 'tag1' },
        { value: 'tag-2', label: 'tag2' },
      ];
      const indicator = createSyntheticsAvailabilityIndicator();
      const slo = createSLO({
        id: 'irrelevant',
        indicator: {
          ...indicator,
          params: {
            ...indicator.params,
            tags,
          },
        } as SLODefinition['indicator'],
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform.source.query?.bool?.filter).toContainEqual({
        terms: {
          tags: ['tag-1', 'tag-2'],
        },
      });
      expect(transform.pivot?.group_by?.tags).toEqual({
        terms: {
          field: 'tags',
        },
      });
    });

    it('adds monitorId filter', async () => {
      const monitorIds = [
        { value: 'id-1', label: 'Monitor name 1' },
        { value: 'id-2', label: 'Monitor name 2' },
      ];
      const indicator = createSyntheticsAvailabilityIndicator();
      const slo = createSLO({
        id: 'irrelevant',
        indicator: {
          ...indicator,
          params: {
            ...indicator.params,
            monitorIds,
          },
        } as SLODefinition['indicator'],
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform.source.query?.bool?.filter).toContainEqual({
        terms: {
          'monitor.id': ['id-1', 'id-2'],
        },
      });
      expect(transform.pivot?.group_by?.['monitor.id']).toEqual({
        terms: {
          field: 'monitor.id',
        },
      });
    });

    it('adds project id filter', async () => {
      const projects = [
        { value: 'id-1', label: 'Project name 1' },
        { value: 'id-2', label: 'Project name 2' },
      ];
      const indicator = createSyntheticsAvailabilityIndicator();
      const slo = createSLO({
        id: 'irrelevant',
        indicator: {
          ...indicator,
          params: {
            ...indicator.params,
            projects,
          },
        } as SLODefinition['indicator'],
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform.source.query?.bool?.filter).toContainEqual({
        terms: {
          'monitor.project.id': ['id-1', 'id-2'],
        },
      });
      expect(transform.pivot?.group_by?.['monitor.project.id']).toEqual({
        terms: {
          field: 'monitor.project.id',
        },
      });
    });

    it('filters by space', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createSyntheticsAvailabilityIndicator(),
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform.source.query?.bool?.filter).toContainEqual({
        term: {
          'meta.space_id': SPACE_ID,
        },
      });
    });

    it("overrides the range filter when 'preventInitialBackfill' is true", async () => {
      const slo = createSLO({
        indicator: createSyntheticsAvailabilityIndicator(),
        settings: {
          frequency: twoMinute(),
          syncDelay: twoMinute(),
          preventInitialBackfill: true,
        },
      });

      const transform = await generator.getTransformParams(slo);

      // @ts-ignore
      const rangeFilter = transform.source.query.bool.filter.find((f) => 'range' in f);

      expect(rangeFilter).toEqual({
        range: {
          '@timestamp': {
            gte: 'now-300s/m', // 2m + 2m + 60s
          },
        },
      });
    });

    it("uses the 'event.ingested' as syncField", async () => {
      const slo = createSLO({
        indicator: createSyntheticsAvailabilityIndicator(),
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform.sync?.time?.field).toEqual('event.ingested');
    });
  });

  describe('when serverless is enabled', () => {
    const generator = new SyntheticsAvailabilityTransformGenerator(
      SPACE_ID,
      dataViewsService,
      true
    );

    it("overrides the syncField with '@timestamp'", async () => {
      const slo = createSLO({
        indicator: createSyntheticsAvailabilityIndicator(),
      });
      const transform = await generator.getTransformParams(slo);

      expect(transform.sync?.time?.field).toEqual('@timestamp');
    });
  });
});
