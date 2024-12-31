/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroupOptionProps,
  EuiFilterButton,
  EuiFilterGroup,
  EuiEmptyPrompt,
  EuiLoadingLogo,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { PreviewTable } from '../../preview_table';

export const ProcessorOutcomePreview = ({ definition, processor }) => {
  const { dependencies } = useKibana();
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const {
    timeRange,
    absoluteTimeRange: { start, end },
    setTimeRange,
  } = useDateRange({ data });

  const { value, loading, error, refresh } = useStreamsAppFetch(
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
    {
      disableToastOnError: true,
    }
  );

  return (
    <EuiPanel hasShadow={false} paddingSize="none">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomeTitle',
            { defaultMessage: 'Outcome' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer />
      {/* TODO: Add Detected Fields sections */}
      <OutcomeControls
        documents={value?.documents}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onTimeRangeRefresh={refresh}
      />
      <EuiSpacer size="m" />
      <OutcomePreviewTable documents={value?.documents} error={error} isLoading={loading} />
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
  documents: any[];
  timeRange: { from: number; to: number };
  onTimeRangeChange: (timeRange: { from: number; to: number }) => void;
  onTimeRangeRefresh: () => void;
}

const OutcomeControls = ({ documents, timeRange, onTimeRangeChange, onTimeRangeRefresh }) => {
  const [selectedDocsFilter, setSelectedDocsFilter] =
    useState<DocsFilterOption>('outcome_filter_all');

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiFilterGroup
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.outcomeControlsAriaLabel',
          { defaultMessage: 'Filter for all, matching or unmatching previewed documents.' }
        )}
      >
        <EuiFilterButton
          hasActiveFilters={selectedDocsFilter === docsFilterOptions.outcome_filter_all.id}
          onClick={() => setSelectedDocsFilter(docsFilterOptions.outcome_filter_all.id)}
        >
          {docsFilterOptions.outcome_filter_all.label}
        </EuiFilterButton>
        <EuiFilterButton
          hasActiveFilters={selectedDocsFilter === docsFilterOptions.outcome_filter_matched.id}
          onClick={() => setSelectedDocsFilter(docsFilterOptions.outcome_filter_matched.id)}
        >
          {docsFilterOptions.outcome_filter_matched.label}
        </EuiFilterButton>
        <EuiFilterButton
          hasActiveFilters={selectedDocsFilter === docsFilterOptions.outcome_filter_unmatched.id}
          onClick={() => setSelectedDocsFilter(docsFilterOptions.outcome_filter_unmatched.id)}
        >
          {docsFilterOptions.outcome_filter_unmatched.label}
        </EuiFilterButton>
      </EuiFilterGroup>

      <StreamsAppSearchBar
        onQuerySubmit={({ dateRange }, isUpdate) => {
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
        }}
        onRefresh={onTimeRangeRefresh}
        dateRangeFrom={timeRange.from}
        dateRangeTo={timeRange.to}
      />
    </EuiFlexGroup>
  );
};

interface OutcomePreviewTableProps {
  documents?: any[];
  columns: any[];
  error: Error;
  isLoading: boolean;
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
