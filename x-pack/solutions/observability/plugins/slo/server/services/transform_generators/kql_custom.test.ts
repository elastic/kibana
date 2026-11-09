/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';
import { ALL_PROJECT_ROUTING, LOCAL_PROJECT_ROUTING } from '../../../common/project_routings';
import { twoMinute } from '../fixtures/duration';
import {
  createKQLCustomIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { KQLCustomTransformGenerator } from './kql_custom';

const SPACE_ID = 'custom-space';
const generator = new KQLCustomTransformGenerator(SPACE_ID, dataViewsService, false);

describe('KQL Custom Transform Generator', () => {
  describe('validation', () => {
    it('throws when the KQL numerator is invalid', async () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ good: '{ kql.query: invalid' }),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid KQL/);
    });
    it('throws when the KQL denominator is invalid', async () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ total: '{ kql.query: invalid' }),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid KQL/);
    });
    it('throws when the KQL query_filter is invalid', async () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ filter: '{ kql.query: invalid' }),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid KQL/);
    });
  });

  it('returns the expected transform params with every specified indicator params', async () => {
    const anSLO = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createKQLCustomIndicator(),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo using timesliceTarget = 0', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createKQLCustomIndicator(),
      objective: {
        target: 0.98,
        timesliceTarget: 0,
        timesliceWindow: twoMinute(),
      },
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot();
  });

  it('filters the source using the kql query', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({ filter: 'labels.groupId: group-4' }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({ index: 'my-own-index*' }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.source.index).toBe('my-own-index*');
  });

  it('uses the provided timestampField', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        timestampField: 'my-date-field',
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.sync?.time?.field).toBe('my-date-field');
    // @ts-ignore
    expect(transform.pivot?.group_by['@timestamp'].date_histogram.field).toBe('my-date-field');
  });

  it('aggregates using the numerator kql', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        good: 'latency < 400 and (http.status_code: 2xx or http.status_code: 3xx or http.status_code: 4xx)',
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using the denominator kql', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        total: 'http.status_code: *',
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });

  it("overrides the range filter when 'preventInitialBackfill' is true", async () => {
    const slo = createSLO({
      indicator: createKQLCustomIndicator(),
      settings: {
        frequency: twoMinute(),
        syncDelay: twoMinute(),
        preventInitialBackfill: true,
        preventCrossProjectSearch: false,
      },
    });

    const transform = await generator.getTransformParams(slo);

    // @ts-ignore
    const rangeFilter = transform.source.query.bool.filter.find((f) => 'range' in f);

    expect(rangeFilter).toEqual({
      range: {
        log_timestamp: {
          gte: 'now-300s/m', // 2m + 2m + 60s
        },
      },
    });
  });

  describe('project_routing', () => {
    const cpsGenerator = new KQLCustomTransformGenerator(SPACE_ID, dataViewsService, true, true);

    const sloWithSettings = (settings: {
      projectRoutings?: string | null;
      preventCrossProjectSearch?: boolean;
    }) => {
      const slo = createSLO({ indicator: createKQLCustomIndicator() });
      return {
        ...slo,
        settings: {
          syncDelay: slo.settings.syncDelay,
          frequency: slo.settings.frequency,
          preventInitialBackfill: slo.settings.preventInitialBackfill,
          ...settings,
        },
      };
    };

    it('uses origin routing for legacy preventCrossProjectSearch true', async () => {
      const transform = await cpsGenerator.getTransformParams(
        sloWithSettings({ preventCrossProjectSearch: true })
      );
      expect(transform.source.project_routing).toBe(LOCAL_PROJECT_ROUTING);
    });

    it('uses all-projects routing when both routing fields are unset', async () => {
      const transform = await cpsGenerator.getTransformParams(sloWithSettings({}));
      expect(transform.source.project_routing).toBe(ALL_PROJECT_ROUTING);
    });

    it('uses all-projects routing when preventCrossProjectSearch is false', async () => {
      const transform = await cpsGenerator.getTransformParams(
        sloWithSettings({ preventCrossProjectSearch: false })
      );
      expect(transform.source.project_routing).toBe(ALL_PROJECT_ROUTING);
    });

    it('lets stored projectRoutings win', async () => {
      const transform = await cpsGenerator.getTransformParams(
        sloWithSettings({
          projectRoutings: '_id:p1 AND _id:p2',
          preventCrossProjectSearch: true,
        })
      );
      expect(transform.source.project_routing).toBe('_id:p1 AND _id:p2');
    });
  });
});
