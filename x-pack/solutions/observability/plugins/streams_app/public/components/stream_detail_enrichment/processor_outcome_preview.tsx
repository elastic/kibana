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
  EuiFlexItem,
  EuiSpacer,
  EuiProgress,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { flattenObject } from '@kbn/object-utils';
import { isEmpty } from 'lodash';
import { RecursiveRecord } from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsAppSearchBar, StreamsAppSearchBarProps } from '../streams_app_search_bar';
import { PreviewTable } from '../preview_table';
import { TableColumn, UseProcessingSimulatorReturn } from './hooks/use_processing_simulator';
import { AssetImage } from '../asset_image';

interface ProcessorOutcomePreviewProps {
  columns: TableColumn[];
  isLoading: UseProcessingSimulatorReturn['isLoading'];
  simulation: UseProcessingSimulatorReturn['simulation'];
  samples: UseProcessingSimulatorReturn['samples'];
  onRefreshSamples: UseProcessingSimulatorReturn['refreshSamples'];
}

export const ProcessorOutcomePreview = ({
  columns,
  isLoading,
  simulation,
  samples,
  onRefreshSamples,
}: ProcessorOutcomePreviewProps) => {
  const { dependencies } = useKibana();
  const { data } = dependencies.start;

  const { timeRange, setTimeRange } = useDateRange({ data });

  const [selectedDocsFilter, setSelectedDocsFilter] =
    useState<DocsFilterOption>('outcome_filter_all');

  const simulationDocuments = useMemo(() => {
    if (!simulation?.documents) {
      return samples.map((doc) => flattenObject(doc)) as RecursiveRecord[];
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
      <OutcomePreviewTable documents={simulationDocuments} columns={tableColumns} />
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
    </>
  );
};

const docsFilterOptions = {
  outcome_filter_all: {
    id: 'outcome_filter_all',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.all',
      { defaultMessage: 'All samples' }
    ),
  },
  outcome_filter_matched: {
    id: 'outcome_filter_matched',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.matched',
      { defaultMessage: 'Matched' }
    ),
  },
  outcome_filter_unmatched: {
    id: 'outcome_filter_unmatched',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.unmatched',
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

  const getFilterButtonPropsFor = (filterId: DocsFilterOption) => ({
    hasActiveFilters: docsFilter === filterId,
    onClick: () => onDocsFilterChange(filterId),
  });

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
      <EuiFilterGroup
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControlsAriaLabel',
          { defaultMessage: 'Filter for all, matching or unmatching previewed documents.' }
        )}
      >
        <EuiFilterButton {...getFilterButtonPropsFor(docsFilterOptions.outcome_filter_all.id)}>
          {docsFilterOptions.outcome_filter_all.label}
        </EuiFilterButton>
        <EuiFilterButton
          {...getFilterButtonPropsFor(docsFilterOptions.outcome_filter_matched.id)}
          badgeColor="success"
          numActiveFilters={
            simulationSuccessRate ? parseFloat((simulationSuccessRate * 100).toFixed(2)) : undefined
          }
        >
          {docsFilterOptions.outcome_filter_matched.label}
        </EuiFilterButton>
        <EuiFilterButton
          {...getFilterButtonPropsFor(docsFilterOptions.outcome_filter_unmatched.id)}
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
  documents: RecursiveRecord[];
  columns: string[];
}

const OutcomePreviewTable = ({ documents, columns }: OutcomePreviewTableProps) => {
  if (isEmpty(documents)) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        icon={<AssetImage type="noResults" />}
        title={
          <h2>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.rootStreamEmptyPrompt.noDataTitle',
              { defaultMessage: 'Unable to generate a preview' }
            )}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomePreviewTable.noDataBody',
              {
                defaultMessage:
                  "There are no sample documents to test the processors. Try updating the time range or ingesting more data, it might be possible we could not find any matching documents with the processors' source fields.",
              }
            )}
          </p>
        }
      />
    );
  }

  return <PreviewTable documents={documents} displayColumns={columns} />;
};
