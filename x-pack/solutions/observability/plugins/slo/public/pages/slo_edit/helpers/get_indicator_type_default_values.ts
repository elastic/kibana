/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicatorType } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import {
  APM_AVAILABILITY_DEFAULT_VALUES,
  APM_LATENCY_DEFAULT_VALUES,
  BUDGETING_METHOD_OPTIONS,
  CUSTOM_KQL_DEFAULT_VALUES,
  HISTOGRAM_DEFAULT_VALUES,
  SLO_EDIT_FORM_DEFAULT_VALUES,
  SLO_EDIT_FORM_DEFAULT_VALUES_CUSTOM_METRIC,
  SLO_EDIT_FORM_DEFAULT_VALUES_SYNTHETICS_AVAILABILITY,
  TIMESLICE_METRIC_DEFAULT_VALUES,
} from '../constants';
import type { CreateSLOForm } from '../types';

export const getIndicatorTypeDefaultValues = (
  indicatorType: IndicatorType,
  apmIndex: string
): CreateSLOForm => {
  switch (indicatorType) {
    case 'sli.metric.custom':
      return SLO_EDIT_FORM_DEFAULT_VALUES_CUSTOM_METRIC;
    case 'sli.metric.timeslice':
      return {
        ...SLO_EDIT_FORM_DEFAULT_VALUES,
        budgetingMethod: BUDGETING_METHOD_OPTIONS[1].value,
        objective: {
          target: 99,
          timesliceTarget: 95,
          timesliceWindow: '1',
        },
        indicator: TIMESLICE_METRIC_DEFAULT_VALUES,
      };
    case 'sli.kql.custom':
      return { ...SLO_EDIT_FORM_DEFAULT_VALUES, indicator: CUSTOM_KQL_DEFAULT_VALUES };
    case 'sli.histogram.custom':
      return { ...SLO_EDIT_FORM_DEFAULT_VALUES, indicator: HISTOGRAM_DEFAULT_VALUES };
    case 'sli.apm.transactionDuration':
      return {
        ...SLO_EDIT_FORM_DEFAULT_VALUES,
        indicator: {
          ...APM_LATENCY_DEFAULT_VALUES,
          params: { ...APM_LATENCY_DEFAULT_VALUES.params, index: apmIndex },
        },
      };
    case 'sli.apm.transactionErrorRate':
      return {
        ...SLO_EDIT_FORM_DEFAULT_VALUES,
        indicator: {
          ...APM_AVAILABILITY_DEFAULT_VALUES,
          params: { ...APM_AVAILABILITY_DEFAULT_VALUES.params, index: apmIndex },
        },
      };
    case 'sli.synthetics.availability':
      return SLO_EDIT_FORM_DEFAULT_VALUES_SYNTHETICS_AVAILABILITY;
    default:
      assertNever(indicatorType);
  }
};
