/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
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
import { FIELD_DEFINITION_TYPES, FieldDefinitionConfig } from '@kbn/streams-schema';
import { useController, useFieldArray, useFormContext } from 'react-hook-form';
import { css } from '@emotion/react';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { StreamsAppSearchBar, StreamsAppSearchBarProps } from '../../streams_app_search_bar';
import { PreviewTable } from '../../preview_table';
import { convertFormStateToProcessing, isCompleteProcessingDefinition } from '../utils';

export const ProcessorOutcomePreview = ({ definition, formFields }) => {
  const { dependencies } = useKibana();
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const { setValue, watch } = useFormContext();

  const {
    timeRange,
    absoluteTimeRange: { start, end },
    setTimeRange,
  } = useDateRange({ data });

  const [selectedDocsFilter, setSelectedDocsFilter] =
    useState<DocsFilterOption>('outcome_filter_all');

  const { value: samples, refresh: refreshSamples } = useStreamsAppFetch(
    ({ signal }) => {
      if (!definition) {
        return Promise.resolve({ documents: [] });
      }

      return streamsRepositoryClient.fetch('POST /api/streams/{id}/_sample', {
        signal,
        params: {
          path: {
            id: definition.name,
          },
          body: {
            start: start?.valueOf(),
            end: end?.valueOf(),
            number: 100,
          },
        },
      });
    },
    [definition, streamsRepositoryClient, start, end],
    { disableToastOnError: true }
  );

  const {
    value: simulation,
    loading: isLoadingSimulation,
    error: simulationError,
    refresh: refreshSimulation,
  } = useStreamsAppFetch(
    async ({ signal }) => {
      if (!definition || !samples || isEmpty(samples.documents)) {
        return Promise.resolve(null);
      }

      const processingDefinition = convertFormStateToProcessing(formFields);

      if (!isCompleteProcessingDefinition(processingDefinition)) {
        return Promise.resolve(null);
      }

      const simulationResult = await streamsRepositoryClient.fetch(
        'POST /api/streams/{id}/processing/_simulate',
        {
          signal,
          params: {
            path: {
              id: definition.name,
            },
            body: {
              documents: samples.documents as Array<Record<PropertyKey, unknown>>,
              processing: [processingDefinition],
            },
          },
        }
      );

      setValue('detected_fields', simulationResult.detected_fields);

      return simulationResult;
    },
    [definition, samples, streamsRepositoryClient],
    { disableToastOnError: true }
  );

  const simulationDocuments = useMemo(() => {
    if (!simulation?.documents) {
      return [];
    }

    let docs = simulation.documents;

    if (selectedDocsFilter === 'outcome_filter_all') {
      docs = simulation.documents;
    }

    if (selectedDocsFilter === 'outcome_filter_matched') {
      docs = simulation.documents.filter((doc) => doc.isMatch);
    }

    if (selectedDocsFilter === 'outcome_filter_unmatched') {
      docs = simulation.documents.filter((doc) => !doc.isMatch);
    }

    return docs.map((doc) => doc.value);
  }, [simulation?.documents, selectedDocsFilter]);

  const detectedFieldsColumns = simulation?.detected_fields
    ? simulation.detected_fields.map((field) => field.name)
    : [];

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
          iconType="play"
          color="accentSecondary"
          size="s"
          onClick={refreshSimulation}
          isLoading={isLoadingSimulation}
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.runSimulation',
            { defaultMessage: 'Run simulation' }
          )}
        </EuiButton>
      </EuiFlexGroup>
      <EuiSpacer />
      {simulation && simulation.detected_fields.length > 0 && <DetectedFields />}
      <OutcomeControls
        docsFilter={selectedDocsFilter}
        onDocsFilterChange={setSelectedDocsFilter}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onTimeRangeRefresh={refreshSamples}
        simulationFailureRate={simulation?.failure_rate}
        simulationSuccessRate={simulation?.success_rate}
      />
      <EuiSpacer size="m" />
      <OutcomePreviewTable
        documents={simulationDocuments}
        columns={[formFields.field, ...detectedFieldsColumns]}
        error={simulationError}
        isLoading={isLoadingSimulation}
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
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
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

interface OutcomePreviewTableProps {
  documents?: Array<Record<PropertyKey, unknown>>;
  columns: string[];
  error?: Error;
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
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomePreviewTable.errorBody',
              {
                defaultMessage:
                  'The processor did not run correctly on the sample documents. Try updating the configuration.',
              }
            )}
          </p>
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

export const DetectedFields = () => {
  const { euiTheme } = useEuiTheme();
  const { fields } = useFieldArray({
    name: 'detected_fields',
  });

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
          <DetectedFieldSelector key={field.name} selectorId={`detected_fields.${id}`} />
        ))}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

const getDetectedFieldSelectOptions = (field, fieldType): Array<EuiSuperSelectOption<string>> =>
  [...FIELD_DEFINITION_TYPES, 'unmapped'].map((type) => ({
    value: type,
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <FieldIcon type={field.value.type} size="s" />
        {field.value.name}
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <FieldIcon type={type} size="s" />
        {type}
      </EuiFlexGroup>
    ),
  }));

const DetectedFieldSelector = ({ selectorId }) => {
  const { field: field } = useController({ name: selectorId });
  const { field: fieldType } = useController({ name: `${selectorId}.type` });

  const options = useMemo(
    () => getDetectedFieldSelectOptions(field, fieldType),
    [field, fieldType]
  );

  return (
    <EuiSuperSelect
      options={options}
      valueOfSelected={fieldType.value ?? 'unmapped'}
      onChange={fieldType.onChange}
      css={css`
        min-inline-size: 180px;
      `}
    />
  );
};
