/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import {
  EuiFlexGroup,
  EuiFilterButton,
  EuiFilterGroup,
  EuiEmptyPrompt,
  EuiLoadingLogo,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { ReadStreamDefinition } from '@kbn/streams-schema';
import { flattenObject } from '@kbn/object-utils';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsAppSearchBar, StreamsAppSearchBarProps } from '../streams_app_search_bar';
import { PreviewTable } from '../preview_table';
import { TableColumn, UseProcessingSimulatorReturnType } from './hooks/use_processing_simulator';

interface ProcessorOutcomePreviewProps {
  definition: ReadStreamDefinition;
  columns: TableColumn[];
  isLoading: UseProcessingSimulatorReturnType['isLoading'];
  simulation: UseProcessingSimulatorReturnType['simulation'];
  samples: UseProcessingSimulatorReturnType['samples'];
  onRefreshSamples: UseProcessingSimulatorReturnType['refreshSamples'];
  simulationError: UseProcessingSimulatorReturnType['error'];
}

export const ProcessorOutcomePreview = ({
  definition,
  columns,
  isLoading,
  simulation,
  samples,
  onRefreshSamples,
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

  const tableColumns = useMemo(() => {
    switch (selectedDocsFilter) {
      case 'outcome_filter_unmatched':
        return columns
          .filter((column) => column.origin === 'processor')
          .map((column) => column.name);
      case 'outcome_filter_matched':
      case 'outcome_filter_all':
      default:
        return columns.map((column) => column.name);
    }
  }, [columns, selectedDocsFilter]);

  return (
    <>
      <EuiFlexItem grow={false}>
        <OutcomeControls
          docsFilter={selectedDocsFilter}
          onDocsFilterChange={setSelectedDocsFilter}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onTimeRangeRefresh={onRefreshSamples}
          simulationFailureRate={simulation?.failure_rate}
          simulationSuccessRate={simulation?.success_rate}
        />
      </EuiFlexItem>
      <EuiSpacer size="m" />
      <EuiFlexItem>
        <OutcomePreviewTable
          documents={simulationDocuments}
          columns={tableColumns}
          error={simulationError}
          isLoading={isLoading}
        />
      </EuiFlexItem>
    </>
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

  return <PreviewTable documents={documents} displayColumns={columns} />;
};
