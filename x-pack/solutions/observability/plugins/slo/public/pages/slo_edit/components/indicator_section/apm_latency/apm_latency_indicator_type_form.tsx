/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
} from '@elastic/eui';
import type { APMTransactionDurationIndicator } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useApmDefaultValues } from '../apm_common/use_apm_default_values';
import { DATA_VIEW_FIELD } from '../custom_common/index_selection';
import { GroupByField } from '../../common/group_by_field';
import { useCreateDataView } from '../../../../../hooks/use_create_data_view';
import { useFetchApmIndex } from '../../../../../hooks/use_fetch_apm_indices';
import type { CreateSLOForm } from '../../../types';
import { FieldSelector } from '../apm_common/field_selector';
import { DataPreviewChart } from '../../common/data_preview_chart';
import { QueryBuilder } from '../../common/query_builder';
import { formatAllFilters } from '../../../helpers/format_filters';
import { getGroupByCardinalityFilters } from '../apm_common/get_group_by_cardinality_filters';
import { useSloFormContext } from '../../slo_form_context';

const LABELS = {
  serviceName: i18n.translate('xpack.slo.sloEdit.apmLatency.serviceName', {
    defaultMessage: 'Service name',
  }),
  serviceNamePlaceholder: i18n.translate('xpack.slo.sloEdit.apmLatency.serviceName.placeholder', {
    defaultMessage: 'Select the APM service',
  }),
  serviceNameTooltip: i18n.translate('xpack.slo.sloEdit.apm.serviceName.tooltip', {
    defaultMessage: 'This is the APM service monitored by this SLO.',
  }),
  serviceEnvironment: i18n.translate('xpack.slo.sloEdit.apmLatency.serviceEnvironment', {
    defaultMessage: 'Service environment',
  }),
  serviceEnvironmentPlaceholder: i18n.translate(
    'xpack.slo.sloEdit.apmLatency.serviceEnvironment.placeholder',
    { defaultMessage: 'Select the environment' }
  ),
  transactionType: i18n.translate('xpack.slo.sloEdit.apmLatency.transactionType', {
    defaultMessage: 'Transaction type',
  }),
  transactionTypePlaceholder: i18n.translate(
    'xpack.slo.sloEdit.apmLatency.transactionType.placeholder',
    { defaultMessage: 'Select the transaction type' }
  ),
  transactionName: i18n.translate('xpack.slo.sloEdit.apmLatency.transactionName', {
    defaultMessage: 'Transaction name',
  }),
  transactionNamePlaceholder: i18n.translate(
    'xpack.slo.sloEdit.apmLatency.transactionName.placeholder',
    { defaultMessage: 'Select the transaction name' }
  ),
  threshold: i18n.translate('xpack.slo.sloEdit.apmLatency.threshold.placeholder', {
    defaultMessage: 'Threshold (ms)',
  }),
  thresholdTooltip: i18n.translate('xpack.slo.sloEdit.apmLatency.threshold.tooltip', {
    defaultMessage:
      'Configure the threshold in milliseconds defining the "good" or "successful" requests for the SLO.',
  }),
  queryFilter: i18n.translate('xpack.slo.sloEdit.apmLatency.filter', {
    defaultMessage: 'Query filter',
  }),
  queryFilterPlaceholder: i18n.translate('xpack.slo.sloEdit.apmLatency.filter.placeholder', {
    defaultMessage: 'Custom filter to apply on the index',
  }),
  queryFilterTooltip: i18n.translate('xpack.slo.sloEdit.apm.filter.tooltip', {
    defaultMessage:
      'This KQL query is used to filter the APM metrics on some relevant criteria for this SLO.',
  }),
  advancedSettings: i18n.translate('xpack.slo.sloEdit.apmLatency.advancedSettings', {
    defaultMessage: 'Advanced settings',
  }),
};

function useApmLatencyFormData() {
  const { control, watch, getFieldState } =
    useFormContext<CreateSLOForm<APMTransactionDurationIndicator>>();
  const { data: apmIndex } = useFetchApmIndex();
  const dataViewId = watch(DATA_VIEW_FIELD);

  const [
    serviceName = '',
    environment = '',
    transactionType = '',
    transactionName = '',
    globalFilters,
  ] = watch([
    'indicator.params.service',
    'indicator.params.environment',
    'indicator.params.transactionType',
    'indicator.params.transactionName',
    'indicator.params.filter',
  ]);

  const indicatorParamsFilters = getGroupByCardinalityFilters({
    serviceName,
    environment,
    transactionType,
    transactionName,
  });
  const allFilters = formatAllFilters(globalFilters, indicatorParamsFilters);

  useApmDefaultValues();

  const { dataView, loading: isIndexFieldsLoading } = useCreateDataView({
    indexPatternString: apmIndex,
    dataViewId,
  });

  return { control, getFieldState, dataView, isIndexFieldsLoading, allFilters };
}

interface ServiceFieldsProps {
  fullWidth?: boolean;
}

function ServiceFields({ fullWidth }: ServiceFieldsProps) {
  return (
    <>
      <FieldSelector
        label={LABELS.serviceName}
        fullWidth={fullWidth}
        placeholder={LABELS.serviceNamePlaceholder}
        fieldName="service.name"
        name="indicator.params.service"
        dataTestSubj="apmLatencyServiceSelector"
        tooltip={<EuiIconTip content={LABELS.serviceNameTooltip} position="top" />}
      />
      <FieldSelector
        label={LABELS.serviceEnvironment}
        fullWidth={fullWidth}
        placeholder={LABELS.serviceEnvironmentPlaceholder}
        fieldName="service.environment"
        name="indicator.params.environment"
        dataTestSubj="apmLatencyEnvironmentSelector"
      />
    </>
  );
}

interface TransactionFieldsProps {
  fullWidth?: boolean;
}

function TransactionFields({ fullWidth }: TransactionFieldsProps) {
  return (
    <>
      <FieldSelector
        label={LABELS.transactionType}
        fullWidth={fullWidth}
        placeholder={LABELS.transactionTypePlaceholder}
        fieldName="transaction.type"
        name="indicator.params.transactionType"
        dataTestSubj="apmLatencyTransactionTypeSelector"
      />
      <FieldSelector
        label={LABELS.transactionName}
        fullWidth={fullWidth}
        placeholder={LABELS.transactionNamePlaceholder}
        fieldName="transaction.name"
        name="indicator.params.transactionName"
        dataTestSubj="apmLatencyTransactionNameSelector"
      />
    </>
  );
}

interface ThresholdFieldProps {
  fullWidth?: boolean;
}

function ThresholdField({ fullWidth }: ThresholdFieldProps) {
  const { control, getFieldState } =
    useFormContext<CreateSLOForm<APMTransactionDurationIndicator>>();

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      label={
        <span>
          {LABELS.threshold} <EuiIconTip content={LABELS.thresholdTooltip} position="top" />
        </span>
      }
      isInvalid={getFieldState('indicator.params.threshold').invalid}
    >
      <Controller
        name="indicator.params.threshold"
        control={control}
        defaultValue={250}
        rules={{ required: true, min: 0 }}
        render={({ field: { ref, ...field }, fieldState }) => (
          <EuiFieldNumber
            {...field}
            fullWidth={fullWidth}
            required
            isInvalid={fieldState.invalid}
            value={String(field.value)}
            data-test-subj="apmLatencyThresholdInput"
            min={0}
            onChange={(event) => field.onChange(Number(event.target.value))}
          />
        )}
      />
    </EuiFormRow>
  );
}

interface QueryFilterFieldProps {
  dataView?: DataView;
}

function QueryFilterField({ dataView }: QueryFilterFieldProps) {
  return (
    <QueryBuilder
      dataTestSubj="apmLatencyFilterInput"
      dataView={dataView}
      label={LABELS.queryFilter}
      name="indicator.params.filter"
      placeholder={LABELS.queryFilterPlaceholder}
      tooltip={<EuiIconTip content={LABELS.queryFilterTooltip} position="top" />}
    />
  );
}

function ApmLatencyFlyout() {
  const { dataView, isIndexFieldsLoading, allFilters } = useApmLatencyFormData();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup direction="column" gutterSize="m">
        <ServiceFields fullWidth />
      </EuiFlexGroup>

      <EuiFlexGroup direction="column" gutterSize="m">
        <TransactionFields fullWidth />
      </EuiFlexGroup>

      <ThresholdField fullWidth />

      <EuiSpacer size="xs" />
      <EuiAccordion id="apmLatencyAdvancedSettings" buttonContent={LABELS.advancedSettings}>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="m">
          <QueryFilterField dataView={dataView} />
          <GroupByField dataView={dataView} isLoading={isIndexFieldsLoading} filters={allFilters} />
        </EuiFlexGroup>
      </EuiAccordion>
      <EuiSpacer size="xs" />

      <DataPreviewChart />
    </EuiFlexGroup>
  );
}

function ApmLatencyFullPage() {
  const { dataView, isIndexFieldsLoading, allFilters } = useApmLatencyFormData();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup direction="row" gutterSize="m">
        <ServiceFields />
      </EuiFlexGroup>

      <EuiFlexGroup direction="row" gutterSize="m">
        <TransactionFields />
      </EuiFlexGroup>

      <ThresholdField />

      <QueryFilterField dataView={dataView} />

      <GroupByField dataView={dataView} isLoading={isIndexFieldsLoading} filters={allFilters} />

      <DataPreviewChart />
    </EuiFlexGroup>
  );
}

export function ApmLatencyIndicatorTypeForm() {
  const { isFlyout } = useSloFormContext();
  return isFlyout ? <ApmLatencyFlyout /> : <ApmLatencyFullPage />;
}
