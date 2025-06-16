/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration, DurationUnit } from '../../domain/models';
import { createAPMTransactionErrorRateIndicator, createSLO } from '../fixtures/slo';
import { ApmTransactionErrorRateTransformGenerator } from './apm_transaction_error_rate';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';

const generator = new ApmTransactionErrorRateTransformGenerator(
  'my-space-id',
  dataViewsService,
  false
);

describe('Transform Generator', () => {
  describe('buildCommonGroupBy', () => {
    it('builds empty runtime mappings without group by', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createAPMTransactionErrorRateIndicator(),
      });

      const commonGroupBy = generator.buildCommonGroupBy(slo);
      expect(commonGroupBy).toMatchSnapshot();
    });

    it.each(['example', ['example'], ['example1', 'example2']])(
      'builds common groupBy with single group by',
      async (groupBy) => {
        const indicator = createAPMTransactionErrorRateIndicator();
        const slo = createSLO({
          id: 'irrelevant',
          groupBy,
          indicator,
        });

        const commonGroupBy = generator.buildCommonGroupBy(slo);
        expect(commonGroupBy).toMatchSnapshot();
      }
    );
  });

  describe('buildCommonRuntimeMappings', () => {
    it('builds empty runtime mappings without data view', async () => {
      const runtimeMappings = generator.buildCommonRuntimeMappings();
      expect(runtimeMappings).toEqual({});
    });
  });

  describe('settings', () => {
    const defaultSettings = {
      syncDelay: new Duration(10, DurationUnit.Minute),
      frequency: new Duration(2, DurationUnit.Minute),
      preventInitialBackfill: true,
    };

    it('builds the transform settings', async () => {
      const slo = createSLO({
        settings: {
          ...defaultSettings,
          syncField: 'my_timestamp_sync_field',
        },
      });
      const settings = generator.buildSettings(slo);
      expect(settings).toMatchSnapshot();
    });

    it('builds the transform settings using the provided settings.syncField', async () => {
      const slo = createSLO({
        settings: {
          ...defaultSettings,
          syncField: 'my_timestamp_sync_field',
        },
      });
      const settings = generator.buildSettings(slo, '@timestamp');
      expect(settings.sync_field).toEqual('my_timestamp_sync_field');
    });

    it('builds the transform settings using provided fallback when no settings.syncField is configured', async () => {
      const slo = createSLO({ settings: defaultSettings });
      const settings = generator.buildSettings(slo, '@timestamp2');
      expect(settings.sync_field).toEqual('@timestamp2');
    });

    it("builds the transform settings using '@timestamp' default fallback when no settings.syncField is configured", async () => {
      const slo = createSLO({ settings: defaultSettings });
      const settings = generator.buildSettings(slo);
      expect(settings.sync_field).toEqual('@timestamp');
    });
  });
});
