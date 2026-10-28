/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricCustomIndicator, TimesliceMetricIndicator } from '@kbn/slo-schema';
import {
  is,
  metricCustomBasicMetric,
  metricCustomDocCountMetric,
  timesliceMetricBasicMetricWithField,
  timesliceMetricPercentileMetric,
} from '@kbn/slo-schema';
import { isEmpty, isObject } from 'lodash';
import type { FieldPath } from 'react-hook-form';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import type { CreateSLOForm } from '../types';

export function useSectionFormValidation() {
  const { control, getFieldState, getValues } = useFormContext<CreateSLOForm>();
  // Subscribes this component (not the form root) to the values and errors read below.
  const [indicatorType] = useWatch({
    control,
    name: ['indicator.type', 'indicator.params', 'name'],
  });
  const formState = useFormState({ control });
  const isInvalid = (field: FieldPath<CreateSLOForm>) => getFieldState(field, formState).invalid;

  let isIndicatorSectionValid: boolean = false;

  switch (indicatorType) {
    case 'sli.metric.custom':
      const isGoodParamsValid = () => {
        const data = getValues('indicator.params.good') as MetricCustomIndicator['params']['good'];
        const isEquationValid = !isInvalid('indicator.params.good.equation');
        const areMetricsValid =
          isObject(data) &&
          (data.metrics ?? []).every((metric) => {
            if (is(metricCustomDocCountMetric, metric)) {
              return true;
            }

            if (is(metricCustomBasicMetric, metric) && !isEmpty(metric.field)) {
              return true;
            }
            return false;
          });
        return isEquationValid && areMetricsValid;
      };

      const isTotalParamsValid = () => {
        const data = getValues(
          'indicator.params.total'
        ) as MetricCustomIndicator['params']['total'];
        const isEquationValid = !isInvalid('indicator.params.total.equation');
        const areMetricsValid =
          isObject(data) &&
          (data.metrics ?? []).every((metric) => {
            if (is(metricCustomDocCountMetric, metric)) {
              return true;
            }
            if (is(metricCustomBasicMetric, metric) && !isEmpty(metric.field)) {
              return true;
            }
            return false;
          });
        return isEquationValid && areMetricsValid;
      };

      isIndicatorSectionValid =
        (
          [
            'indicator.params.index',
            'indicator.params.filter',
            'indicator.params.timestampField',
          ] as const
        ).every((field) => !isInvalid(field)) &&
        (['indicator.params.index', 'indicator.params.timestampField'] as const).every(
          (field) => !!getValues(field)
        ) &&
        isGoodParamsValid() &&
        isTotalParamsValid();
      break;
    case 'sli.metric.timeslice':
      const isMetricParamsValid = () => {
        const data = getValues(
          'indicator.params.metric'
        ) as TimesliceMetricIndicator['params']['metric'];
        const isEquationValid = !isInvalid('indicator.params.metric.equation');
        const areMetricsValid =
          isObject(data) &&
          (data.metrics ?? []).every((metric) => {
            if (is(timesliceMetricBasicMetricWithField, metric)) {
              return Boolean(metric.field);
            }
            if (is(timesliceMetricPercentileMetric, metric)) {
              return Boolean(metric.field) && Boolean(metric.percentile);
            }
            return true;
          });
        return isEquationValid && areMetricsValid;
      };

      isIndicatorSectionValid =
        (
          [
            'indicator.params.index',
            'indicator.params.filter',
            'indicator.params.timestampField',
          ] as const
        ).every((field) => !isInvalid(field)) &&
        (['indicator.params.index', 'indicator.params.timestampField'] as const).every(
          (field) => !!getValues(field)
        ) &&
        isMetricParamsValid();
      break;
    case 'sli.histogram.custom':
      const isRangeValid = (type: 'good' | 'total') => {
        const aggregation = getValues(`indicator.params.${type}.aggregation`);
        // If aggreagtion is a value count we can exit early with true
        if (aggregation === 'value_count') {
          return true;
        }
        const from = getValues(`indicator.params.${type}.from`);
        const to = getValues(`indicator.params.${type}.to`);
        // If both from and to are defined and from is less that to, return true
        if (from != null && to != null && from < to) {
          return true;
        }
        return false;
      };
      isIndicatorSectionValid =
        (
          [
            'indicator.params.index',
            'indicator.params.filter',
            'indicator.params.timestampField',
            'indicator.params.good.aggregation',
            'indicator.params.total.aggregation',
            'indicator.params.good.field',
            'indicator.params.total.field',
            'indicator.params.good.filter',
            'indicator.params.total.filter',
          ] as const
        ).every((field) => !isInvalid(field)) &&
        (
          [
            'indicator.params.good.aggregation',
            'indicator.params.total.aggregation',
            'indicator.params.good.field',
            'indicator.params.total.field',
            'indicator.params.index',
            'indicator.params.timestampField',
          ] as const
        ).every((field) => !!getValues(field)) &&
        isRangeValid('good') &&
        isRangeValid('total');
      break;
    case 'sli.kql.custom':
      isIndicatorSectionValid =
        (
          [
            'indicator.params.index',
            'indicator.params.filter',
            'indicator.params.total',
            'indicator.params.timestampField',
          ] as const
        ).every((field) => !isInvalid(field)) &&
        (
          [
            'indicator.params.good',
            'indicator.params.index',
            'indicator.params.timestampField',
          ] as const
        ).every((field) => !!getValues(field));
      break;
    case 'sli.apm.transactionDuration':
      isIndicatorSectionValid =
        (
          [
            'indicator.params.service',
            'indicator.params.environment',
            'indicator.params.transactionType',
            'indicator.params.transactionName',
            'indicator.params.threshold',
          ] as const
        ).every((field) => !isInvalid(field) && getValues(field) !== '') &&
        !isInvalid('indicator.params.index');
      break;
    case 'sli.apm.transactionErrorRate':
      isIndicatorSectionValid =
        (
          [
            'indicator.params.service',
            'indicator.params.environment',
            'indicator.params.transactionType',
            'indicator.params.transactionName',
          ] as const
        ).every((field) => !isInvalid(field) && getValues(field) !== '') &&
        (['indicator.params.index'] as const).every((field) => !isInvalid(field));
      break;
    case 'sli.synthetics.availability':
      isIndicatorSectionValid =
        (['indicator.params.monitorIds'] as const).every(
          (field) => !isInvalid(field) && getValues(field)?.length
        ) &&
        (
          ['indicator.params.index', 'indicator.params.tags', 'indicator.params.projects'] as const
        ).every((field) => !isInvalid(field));
      break;
    default:
      isIndicatorSectionValid = false;
      break;
  }

  const isObjectiveSectionValid = (
    [
      'budgetingMethod',
      'timeWindow.duration',
      'objective.target',
      'objective.timesliceTarget',
      'objective.timesliceWindow',
      'settings.syncDelay',
      'settings.frequency',
    ] as const
  ).every((field) => !isInvalid(field));

  const isDescriptionSectionValid =
    !isInvalid('name') && getValues('name') !== '' && !isInvalid('description');

  return {
    isIndicatorSectionValid,
    isObjectiveSectionValid,
    isDescriptionSectionValid,
  };
}
