/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import { oneMinute, twoMinute } from '../fixtures/duration';
import {
  createAPMTransactionErrorRateIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { ApmTransactionErrorRateTransformGenerator } from './apm_transaction_error_rate';

const SPACE_ID = 'custom-space';
const generator = new ApmTransactionErrorRateTransformGenerator(SPACE_ID, dataViewsService, false);

describe('APM Transaction Error Rate Transform Generator', () => {
  it('returns the expected transform params with every specified indicator params', async () => {
    const slo = createSLO({
      id: 'irrelevant',
      indicator: createAPMTransactionErrorRateIndicator(),
    });
    const transform = await generator.getTransformParams(slo);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createAPMTransactionErrorRateIndicator(),
    });
    const transform = await generator.getTransformParams(slo);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo using timesliceTarget = 0', async () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createAPMTransactionErrorRateIndicator(),
      objective: {
        target: 0.98,
        timesliceTarget: 0,
        timesliceWindow: twoMinute(),
      },
    });
    const transform = await generator.getTransformParams(slo);

    expect(transform).toMatchSnapshot();
  });

  it("does not include the query filter when params are '*'", async () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        environment: ALL_VALUE,
        service: ALL_VALUE,
        transactionName: ALL_VALUE,
        transactionType: ALL_VALUE,
      }),
    });
    const transform = await generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index params as source index', async () => {
    const index = 'my-custom-apm-index*';
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        index,
      }),
    });
    const transform = await generator.getTransformParams(slo);

    expect(transform.source.index).toEqual(index);
  });

  it('adds the custom kql filter to the query', async () => {
    const filter = `"my.field" : "value" and ("foo" >= 12 or "bar" <= 100)`;
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        filter,
      }),
    });
    const transform = await generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
  });

  it("groups by the 'service.name'", async () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        service: 'my-service',
        environment: ALL_VALUE,
        transactionName: ALL_VALUE,
        transactionType: ALL_VALUE,
      }),
    });

    const transform = await generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
    expect(transform.pivot?.group_by).toMatchSnapshot();
  });

  it("groups by the 'service.environment'", async () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        service: ALL_VALUE,
        environment: 'production',
        transactionName: ALL_VALUE,
        transactionType: ALL_VALUE,
      }),
    });

    const transform = await generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
    expect(transform.pivot?.group_by).toMatchSnapshot();
  });

  it("groups by the 'transaction.name'", async () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        service: ALL_VALUE,
        environment: ALL_VALUE,
        transactionName: 'GET /foo',
        transactionType: ALL_VALUE,
      }),
    });

    const transform = await generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
    expect(transform.pivot?.group_by).toMatchSnapshot();
  });

  it("groups by the 'transaction.type'", async () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({
        service: ALL_VALUE,
        environment: ALL_VALUE,
        transactionName: ALL_VALUE,
        transactionType: 'request',
      }),
    });

    const transform = await generator.getTransformParams(slo);

    expect(transform.source.query).toMatchSnapshot();
    expect(transform.pivot?.group_by).toMatchSnapshot();
  });

  it("overrides the range filter when 'preventInitialBackfill' is true", async () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator(),
      settings: {
        frequency: oneMinute(),
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
          gte: 'now-240s/m', // 1m + 2m + 60s
        },
      },
    });
  });
});
