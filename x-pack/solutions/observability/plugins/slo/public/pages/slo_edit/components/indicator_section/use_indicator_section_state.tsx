/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import type { IndicatorType } from '@kbn/slo-schema';
import { SLI_OPTIONS } from '../../constants';
import type { CreateSLOForm } from '../../types';
import { toIndicatorTypeDescription, toIndicatorTypeLabel } from '../../../../utils/slo/labels';
import { useSloFormContext } from '../slo_form_context';
import { ApmAvailabilityIndicatorTypeForm } from './apm_availability/apm_availability_indicator_type_form';
import { ApmLatencyIndicatorTypeForm } from './apm_latency/apm_latency_indicator_type_form';
import { CustomKqlIndicatorTypeForm } from './custom_kql/custom_kql_indicator_type_form';
import { CustomMetricIndicatorTypeForm } from './custom_metric/custom_metric_type_form';
import { HistogramIndicatorTypeForm } from './histogram/histogram_indicator_type_form';
import { SyntheticsAvailabilityIndicatorTypeForm } from './synthetics_availability/synthetics_availability_indicator_type_form';
import { TimesliceMetricIndicatorTypeForm } from './timeslice_metric/timeslice_metric_indicator';

const INDICATOR_TYPE_DATA: Record<
  IndicatorType,
  { documentationUrl: string; formComponent: React.ReactNode }
> = {
  'sli.kql.custom': {
    documentationUrl: 'https://ela.st/docs-create-custom-kql-slo',
    formComponent: <CustomKqlIndicatorTypeForm />,
  },
  'sli.apm.transactionDuration': {
    documentationUrl: 'https://ela.st/docs-create-slo-apm',
    formComponent: <ApmLatencyIndicatorTypeForm />,
  },
  'sli.apm.transactionErrorRate': {
    documentationUrl: 'https://ela.st/docs-create-slo-apm',
    formComponent: <ApmAvailabilityIndicatorTypeForm />,
  },
  'sli.synthetics.availability': {
    documentationUrl: 'https://ela.st/docs-create-synthetics-slo',
    formComponent: <SyntheticsAvailabilityIndicatorTypeForm />,
  },
  'sli.metric.custom': {
    documentationUrl: 'https://ela.st/docs-create-custom-metric-slo',
    formComponent: <CustomMetricIndicatorTypeForm />,
  },
  'sli.histogram.custom': {
    documentationUrl: 'https://ela.st/docs-create-histogram-metric-slo',
    formComponent: <HistogramIndicatorTypeForm />,
  },
  'sli.metric.timeslice': {
    documentationUrl: 'https://ela.st/docs-create-timeslice-metric-slo',
    formComponent: <TimesliceMetricIndicatorTypeForm />,
  },
} as const;

export function useIndicatorSectionState() {
  const { allowedIndicatorTypes } = useSloFormContext();
  const { watch } = useFormContext<CreateSLOForm>();

  const indicatorType = watch('indicator.type');

  const filteredSliOptions = useMemo(() => {
    if (allowedIndicatorTypes.length === 0) {
      return SLI_OPTIONS;
    }
    return SLI_OPTIONS.filter((option) => allowedIndicatorTypes.includes(option.value));
  }, [allowedIndicatorTypes]);

  const indicatorTypeData = indicatorType ? INDICATOR_TYPE_DATA[indicatorType] : null;

  const documentationUrl = indicatorTypeData?.documentationUrl;
  const indicatorTypeForm = indicatorTypeData?.formComponent;

  return {
    documentationUrl,
    filteredSliOptions,
    indicatorTypeDescription: toIndicatorTypeDescription(indicatorType),
    indicatorTypeForm,
    indicatorTypeLabel: toIndicatorTypeLabel(indicatorType),
  };
}
