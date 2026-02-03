/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { assertNever } from '@kbn/std';
import React, { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { SLI_OPTIONS } from '../constants';
import { useUnregisterFields } from '../hooks/use_unregister_fields';
import type { CreateSLOForm, FormSettings } from '../types';
import { MAX_WIDTH } from '../constants';
import { toIndicatorTypeLabel, toIndicatorTypeDescription } from '../../../utils/slo/labels';
import { ApmAvailabilityIndicatorTypeForm } from './indicator_section/apm_availability/apm_availability_indicator_type_form';
import { ApmLatencyIndicatorTypeForm } from './indicator_section/apm_latency/apm_latency_indicator_type_form';
import { CustomKqlIndicatorTypeForm } from './indicator_section/custom_kql/custom_kql_indicator_type_form';
import { CustomMetricIndicatorTypeForm } from './indicator_section/custom_metric/custom_metric_type_form';
import { HistogramIndicatorTypeForm } from './indicator_section/histogram/histogram_indicator_type_form';
import { SyntheticsAvailabilityIndicatorTypeForm } from './indicator_section/synthetics_availability/synthetics_availability_indicator_type_form';
import { TimesliceMetricIndicatorTypeForm } from './indicator_section/timeslice_metric/timeslice_metric_indicator';

interface SloEditFormIndicatorSectionProps {
  formSettings: FormSettings;
}

export function SloEditFormIndicatorSection({ formSettings }: SloEditFormIndicatorSectionProps) {
  const { isEditMode = false, isFlyout = false, allowedIndicatorTypes = [] } = formSettings;
  const { control, watch } = useFormContext<CreateSLOForm>();
  useUnregisterFields({ isEditMode });

  const indicatorType = watch('indicator.type');

  const filteredSliOptions = useMemo(() => {
    if (allowedIndicatorTypes.length === 0) {
      return SLI_OPTIONS;
    }
    return SLI_OPTIONS.filter((option) => allowedIndicatorTypes.includes(option.value));
  }, [allowedIndicatorTypes]);

  const documentationUrl = useMemo(() => {
    switch (indicatorType) {
      case 'sli.kql.custom':
        return 'https://ela.st/docs-create-custom-kql-slo';
      case 'sli.apm.transactionDuration':
      case 'sli.apm.transactionErrorRate':
        return 'https://ela.st/docs-create-slo-apm';
      case 'sli.synthetics.availability':
        return 'https://ela.st/docs-create-synthetics-slo';
      case 'sli.metric.custom':
        return 'https://ela.st/docs-create-custom-metric-slo';
      case 'sli.histogram.custom':
        return 'https://ela.st/docs-create-histogram-metric-slo';
      case 'sli.metric.timeslice':
        return 'https://ela.st/docs-create-timeslice-metric-slo';
      default:
        return null;
    }
  }, [indicatorType]);

  const indicatorTypeForm = useMemo(() => {
    switch (indicatorType) {
      case 'sli.kql.custom':
        return <CustomKqlIndicatorTypeForm isFlyout={isFlyout} />;
      case 'sli.apm.transactionDuration':
        return <ApmLatencyIndicatorTypeForm isFlyout={isFlyout} />;
      case 'sli.apm.transactionErrorRate':
        return <ApmAvailabilityIndicatorTypeForm isFlyout={isFlyout} />;
      case 'sli.synthetics.availability':
        return <SyntheticsAvailabilityIndicatorTypeForm />;
      case 'sli.metric.custom':
        return <CustomMetricIndicatorTypeForm isFlyout={isFlyout} />;
      case 'sli.histogram.custom':
        return <HistogramIndicatorTypeForm isFlyout={isFlyout} />;
      case 'sli.metric.timeslice':
        return <TimesliceMetricIndicatorTypeForm isFlyout={isFlyout} />;
      default:
        assertNever(indicatorType);
    }
  }, [indicatorType, isFlyout]);

  if (isFlyout) {
    return (
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="none"
        data-test-subj="sloEditFormIndicatorSection"
      >
        <EuiPanel color="subdued" hasBorder={false} hasShadow={false} paddingSize="m">
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h4>{toIndicatorTypeLabel(indicatorType)}</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">{toIndicatorTypeDescription(indicatorType)}</EuiText>
            </EuiFlexItem>
            {documentationUrl && (
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="sloSloEditFormIndicatorSectionViewDocumentationButton"
                  href={documentationUrl}
                  target="_blank"
                >
                  {i18n.translate('xpack.slo.sloEdit.flyout.viewDocumentation', {
                    defaultMessage: 'View documentation',
                  })}
                </EuiLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
          {!isEditMode && (
            <>
              <EuiFormRow label={indicatorLabel} fullWidth>
                <Controller
                  name="indicator.type"
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { ref, ...field } }) => (
                    <EuiSelect
                      {...field}
                      required
                      fullWidth
                      data-test-subj="sloFormIndicatorTypeSelect"
                      options={filteredSliOptions}
                      aria-label={indicatorLabel}
                    />
                  )}
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
            </>
          )}
          {indicatorTypeForm}
        </EuiPanel>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth: MAX_WIDTH }}
      data-test-subj="sloEditFormIndicatorSection"
    >
      {!isEditMode && (
        <>
          <EuiFormRow label={indicatorLabel}>
            <Controller
              name="indicator.type"
              control={control}
              rules={{ required: true }}
              render={({ field: { ref, ...field } }) => (
                <EuiSelect
                  {...field}
                  required
                  data-test-subj="sloFormIndicatorTypeSelect"
                  options={filteredSliOptions}
                  aria-label={indicatorLabel}
                />
              )}
            />
          </EuiFormRow>
          <EuiSpacer size="xl" />
        </>
      )}
      {indicatorTypeForm}
    </EuiPanel>
  );
}

const indicatorLabel = i18n.translate('xpack.slo.sloEdit.definition.sliType', {
  defaultMessage: 'Choose the SLI type',
});
