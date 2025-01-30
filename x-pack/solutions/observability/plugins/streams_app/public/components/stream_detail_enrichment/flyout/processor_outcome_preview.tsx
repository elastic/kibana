/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFilterButton,
  EuiFilterGroup,
  EuiEmptyPrompt,
  EuiLoadingLogo,
  EuiButton,
  EuiFormRow,
  EuiSuperSelectOption,
  EuiSuperSelect,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { isEmpty } from 'lodash';
import { FieldIcon } from '@kbn/react-field';
import {
  FIELD_DEFINITION_TYPES,
  ReadStreamDefinition,
  isWiredReadStream,
} from '@kbn/streams-schema';
import { UseControllerProps, useController, useFieldArray } from 'react-hook-form';
import { css } from '@emotion/react';
import { flattenObject } from '@kbn/object-utils';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useKibana } from '../../../hooks/use_kibana';
import { StreamsAppSearchBar, StreamsAppSearchBarProps } from '../../streams_app_search_bar';
import { PreviewTable } from '../../preview_table';
import { convertFormStateToProcessing } from '../utils';
import { DetectedField, ProcessorFormState } from '../types';
import { UseProcessingSimulatorReturnType } from '../hooks/use_processing_simulator';

interface ProcessorOutcomePreviewProps {
  definition: ReadStreamDefinition;
  formFields: ProcessorFormState;
  isLoading: UseProcessingSimulatorReturnType['isLoading'];
  simulation: UseProcessingSimulatorReturnType['simulation'];
  samples: UseProcessingSimulatorReturnType['samples'];
  onRefreshSamples: UseProcessingSimulatorReturnType['refreshSamples'];
  onSimulate: UseProcessingSimulatorReturnType['simulate'];
  simulationError: UseProcessingSimulatorReturnType['error'];
}

export const ProcessorOutcomePreview = ({
  definition,
  formFields,
  isLoading,
  simulation,
  samples,
  onRefreshSamples,
  onSimulate,
  simulationError,
}: ProcessorOutcomePreviewProps) => {
  const { dependencies } = useKibana();
  const { data } = dependencies.start;

  const { timeRange, setTimeRange } = useDateRange({ data });

  const [selectedDocsFilter, setSelectedDocsFilter] =
    useState<DocsFilterOption>('outcome_filter_all');

  const simulationDocuments = useMemo(() => {
    if (!simulation?.documents) {
      return samples.map((doc) => flattenObject(doc));
    }

    const filterDocuments = (filter: DocsFilterOption) => {
      switch (filter) {
        case 'outcome_filter_matched':
          return simulation.documents.filter((doc) => doc.isMatch);
        case 'outcome_filter_unmatched':
          return simulation.documents.filter((doc) => !doc.isMatch);
        case 'outcome_filter_all':
        default:
          return simulation.documents;
      }
    };

    return filterDocuments(selectedDocsFilter).map((doc) => doc.value);
  }, [samples, simulation?.documents, selectedDocsFilter]);

  const detectedFieldsColumns = useMemo(
    () =>
      simulation?.detected_fields ? simulation.detected_fields.map((field) => field.name) : [],
    [simulation?.detected_fields]
  );

  const tableColumns = useMemo(() => {
    switch (selectedDocsFilter) {
      case 'outcome_filter_unmatched':
        return [formFields.field];
      case 'outcome_filter_matched':
      case 'outcome_filter_all':
      default:
        return [formFields.field, ...detectedFieldsColumns];
    }
  }, [formFields.field, detectedFieldsColumns, selectedDocsFilter]);

  const detectedFieldsEnabled =
    isWiredReadStream(definition) &&
    ((simulation && !isEmpty(simulation.detected_fields)) || !isEmpty(formFields.detected_fields));

  return (
    <EuiPanel hasShadow={false} paddingSize="none">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomeTitle',
              { defaultMessage: 'Outcome' }
            )}
          </h3>
        </EuiTitle>
        <EuiButton
          data-test-subj="streamsAppProcessorOutcomePreviewRunSimulationButton"
          iconType="play"
          color="accentSecondary"
          size="s"
          onClick={() => {
            onSimulate(convertFormStateToProcessing(formFields), formFields.detected_fields);
          }}
          isLoading={isLoading}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.runSimulation',
            { defaultMessage: 'Run simulation' }
          )}
        </EuiButton>
      </EuiFlexGroup>
      <EuiSpacer />
      {detectedFieldsEnabled && <DetectedFields detectedFields={simulation?.detected_fields} />}
      <OutcomeControls
        docsFilter={selectedDocsFilter}
        onDocsFilterChange={setSelectedDocsFilter}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onTimeRangeRefresh={onRefreshSamples}
        simulationFailureRate={simulation?.failure_rate}
        simulationSuccessRate={simulation?.success_rate}
      />
      <EuiSpacer size="m" />
      <OutcomePreviewTable
        documents={simulationDocuments}
        columns={tableColumns}
        error={simulationError}
        isLoading={isLoading}
      />
    </EuiPanel>
  );
};

const docsFilterOptions = {
  outcome_filter_all: {
    id: 'outcome_filter_all',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomeControls.all',
      { defaultMessage: 'All samples' }
    ),
  },
  outcome_filter_matched: {
    id: 'outcome_filter_matched',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomeControls.matched',
      { defaultMessage: 'Matched' }
    ),
  },
  outcome_filter_unmatched: {
    id: 'outcome_filter_unmatched',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomeControls.unmatched',
      { defaultMessage: 'Unmatched' }
    ),
  },
} as const;

type DocsFilterOption = keyof typeof docsFilterOptions;

interface OutcomeControlsProps {
  docsFilter: DocsFilterOption;
  timeRange: TimeRange;
  onDocsFilterChange: (filter: DocsFilterOption) => void;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  onTimeRangeRefresh: () => void;
  simulationFailureRate?: number;
  simulationSuccessRate?: number;
}

const OutcomeControls = ({
  docsFilter,
  timeRange,
  onDocsFilterChange,
  onTimeRangeChange,
  onTimeRangeRefresh,
  simulationFailureRate,
  simulationSuccessRate,
}: OutcomeControlsProps) => {
  const handleQuerySubmit: StreamsAppSearchBarProps['onQuerySubmit'] = (
    { dateRange },
    isUpdate
  ) => {
    if (!isUpdate) {
      return onTimeRangeRefresh();
    }

    if (dateRange) {
      onTimeRangeChange({
        from: dateRange.from,
        to: dateRange?.to,
        mode: dateRange.mode,
      });
    }
  };

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
      <EuiFilterGroup
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomeControlsAriaLabel',
          { defaultMessage: 'Filter for all, matching or unmatching previewed documents.' }
        )}
      >
        <EuiFilterButton
          hasActiveFilters={docsFilter === docsFilterOptions.outcome_filter_all.id}
          onClick={() => onDocsFilterChange(docsFilterOptions.outcome_filter_all.id)}
        >
          {docsFilterOptions.outcome_filter_all.label}
        </EuiFilterButton>
        <EuiFilterButton
          hasActiveFilters={docsFilter === docsFilterOptions.outcome_filter_matched.id}
          onClick={() => onDocsFilterChange(docsFilterOptions.outcome_filter_matched.id)}
          badgeColor="success"
          numActiveFilters={
            simulationSuccessRate ? parseFloat((simulationSuccessRate * 100).toFixed(2)) : undefined
          }
        >
          {docsFilterOptions.outcome_filter_matched.label}
        </EuiFilterButton>
        <EuiFilterButton
          hasActiveFilters={docsFilter === docsFilterOptions.outcome_filter_unmatched.id}
          onClick={() => onDocsFilterChange(docsFilterOptions.outcome_filter_unmatched.id)}
          badgeColor="accent"
          numActiveFilters={
            simulationFailureRate ? parseFloat((simulationFailureRate * 100).toFixed(2)) : undefined
          }
        >
          {docsFilterOptions.outcome_filter_unmatched.label}
        </EuiFilterButton>
      </EuiFilterGroup>
      <StreamsAppSearchBar
        onQuerySubmit={handleQuerySubmit}
        onRefresh={onTimeRangeRefresh}
        dateRangeFrom={timeRange.from}
        dateRangeTo={timeRange.to}
      />
    </EuiFlexGroup>
  );
};

const DetectedFields = ({ detectedFields }: { detectedFields?: DetectedField[] }) => {
  const { euiTheme } = useEuiTheme();
  const { fields, replace } = useFieldArray<{ detected_fields: DetectedField[] }>({
    name: 'detected_fields',
  });

  useEffect(() => {
    if (detectedFields) replace(detectedFields);
  }, [detectedFields, replace]);

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.detectedFieldsLabel',
        { defaultMessage: 'Detected fields' }
      )}
      css={css`
        margin-bottom: ${euiTheme.size.l};
      `}
      fullWidth
    >
      <EuiFlexGroup gutterSize="s" wrap>
        {fields.map((field, id) => (
          <DetectedFieldSelector key={field.name} name={`detected_fields.${id}`} />
        ))}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

const DetectedFieldSelector = (
  props: UseControllerProps<ProcessorFormState, `detected_fields.${number}`>
) => {
  const { field } = useController(props);

  const options = useMemo(() => getDetectedFieldSelectOptions(field.value), [field.value]);

  return (
    <EuiSuperSelect
      options={options}
      valueOfSelected={field.value.type}
      onChange={(type) => field.onChange({ ...field.value, type })}
      css={css`
        min-inline-size: 180px;
      `}
    />
  );
};

const getDetectedFieldSelectOptions = (
  fieldValue: DetectedField
): Array<EuiSuperSelectOption<string>> =>
  [...FIELD_DEFINITION_TYPES, 'unmapped'].map((type) => ({
    value: type,
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <FieldIcon type={fieldValue.type} size="s" />
        {fieldValue.name}
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <FieldIcon type={type} size="s" />
        {type}
      </EuiFlexGroup>
    ),
  }));

interface OutcomePreviewTableProps {
  documents?: Array<Record<PropertyKey, unknown>>;
  columns: string[];
  error?: IHttpFetchError<ResponseErrorBody>;
  isLoading?: boolean;
}

const OutcomePreviewTable = ({
  documents = [],
  columns,
  error,
  isLoading,
}: OutcomePreviewTableProps) => {
  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={
          <h3>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomePreviewTable.errorTitle',
              { defaultMessage: 'Unable to display the simulation outcome for this processor.' }
            )}
          </h3>
        }
        body={
          <>
            <p>
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomePreviewTable.errorBody',
                { defaultMessage: 'The processor did not run correctly.' }
              )}
            </p>
            {error.body?.message ? <p>{error.body.message}</p> : null}
          </>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoLogging" size="l" />}
        title={
          <h3>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomePreviewTable.loadingTitle',
              { defaultMessage: 'Running processor simulation' }
            )}
          </h3>
        }
      />
    );
  }

  if (documents?.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="dataVisualizer"
        body={
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomePreviewTable.noDataTitle',
              {
                defaultMessage:
                  'There are no simulation outcome documents for the current selection.',
              }
            )}
          </p>
        }
      />
    );
  }

  return <PreviewTable documents={documents} displayColumns={columns} height={500} />;
};
