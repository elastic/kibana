/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicatorType } from '@kbn/slo-schema';
import {
  APM_LATENCY_DEFAULT_VALUES,
  SLO_EDIT_FORM_DEFAULT_VALUES,
  SLO_EDIT_FORM_DEFAULT_VALUES_SYNTHETICS_AVAILABILITY,
} from '../constants';
import { getIndicatorTypeDefaultValues } from './get_indicator_type_default_values';

const APM_INDEX = 'apm-metrics-*';

describe('getIndicatorTypeDefaultValues', () => {
  it.each<IndicatorType>([
    'sli.kql.custom',
    'sli.metric.custom',
    'sli.metric.timeslice',
    'sli.histogram.custom',
    'sli.apm.transactionDuration',
    'sli.apm.transactionErrorRate',
    'sli.synthetics.availability',
  ])('returns the %s indicator type', (indicatorType) => {
    expect(getIndicatorTypeDefaultValues(indicatorType, APM_INDEX).indicator.type).toBe(
      indicatorType
    );
  });

  it.each<IndicatorType>(['sli.apm.transactionDuration', 'sli.apm.transactionErrorRate'])(
    'sets the APM index on the %s indicator',
    (indicatorType) => {
      const { indicator } = getIndicatorTypeDefaultValues(indicatorType, APM_INDEX);

      expect(indicator.params).toHaveProperty('index', APM_INDEX);
    }
  );

  it('switches the timeslice metric indicator to the timeslices budgeting method', () => {
    const { budgetingMethod, objective } = getIndicatorTypeDefaultValues(
      'sli.metric.timeslice',
      APM_INDEX
    );

    expect(budgetingMethod).toBe('timeslices');
    expect(objective).toEqual({ target: 99, timesliceTarget: 95, timesliceWindow: 1 });
  });

  it('returns the synthetics availability form defaults', () => {
    expect(getIndicatorTypeDefaultValues('sli.synthetics.availability', APM_INDEX)).toEqual(
      SLO_EDIT_FORM_DEFAULT_VALUES_SYNTHETICS_AVAILABILITY
    );
  });

  it('does not mutate the shared default values', () => {
    const formDefaults = structuredClone(SLO_EDIT_FORM_DEFAULT_VALUES);
    const apmLatencyDefaults = structuredClone(APM_LATENCY_DEFAULT_VALUES);

    getIndicatorTypeDefaultValues('sli.apm.transactionDuration', APM_INDEX);
    getIndicatorTypeDefaultValues('sli.metric.timeslice', APM_INDEX);

    expect(SLO_EDIT_FORM_DEFAULT_VALUES).toEqual(formDefaults);
    expect(APM_LATENCY_DEFAULT_VALUES).toEqual(apmLatencyDefaults);
  });
});
