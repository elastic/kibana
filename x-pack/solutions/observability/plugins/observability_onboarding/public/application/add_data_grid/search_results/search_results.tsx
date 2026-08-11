/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexItem,
  EuiScreenReaderLive,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const COLUMNS = 3;

export interface AddDataSearchResultsProps<TItem extends { id: string }> {
  searchTerm: string;
  items: readonly TItem[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  renderCard: (item: TItem) => React.ReactNode;
}

export function AddDataSearchResults<TItem extends { id: string }>({
  searchTerm,
  items,
  isLoading,
  isError = false,
  onRetry,
  renderCard,
}: AddDataSearchResultsProps<TItem>) {
  const countId = useGeneratedHtmlId({ prefix: 'addDataSearchResultsCount' });

  if (isError) {
    return (
      <EuiCallOut
        announceOnMount
        color="warning"
        iconType="warning"
        title={i18n.translate(
          'xpack.observability_onboarding.addDataGrid.searchResults.errorTitle',
          {
            defaultMessage: 'Loading failure',
          }
        )}
        data-test-subj="addDataSearchResultsError"
      >
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.addDataGrid.searchResults.errorBody"
            defaultMessage="Some required elements failed to load."
          />
        </p>
        {onRetry && (
          <EuiButton
            color="warning"
            onClick={onRetry}
            data-test-subj="addDataSearchResultsRetryButton"
          >
            <FormattedMessage
              id="xpack.observability_onboarding.addDataGrid.searchResults.retryButtonLabel"
              defaultMessage="Retry"
            />
          </EuiButton>
        )}
      </EuiCallOut>
    );
  }

  if (isLoading) {
    return <EuiSkeletonText isLoading lines={5} data-test-subj="addDataSearchResultsLoading" />;
  }

  const isEmpty = items.length === 0;
  const emptyLabel = i18n.translate(
    'xpack.observability_onboarding.addDataGrid.searchResults.emptyTitle',
    { defaultMessage: 'No results for {searchTerm}', values: { searchTerm } }
  );
  const countContent = (
    <FormattedMessage
      id="xpack.observability_onboarding.addDataGrid.searchResults.countHeader"
      defaultMessage="Showing <strong>{count, plural, one {# integration} other {# integrations}}</strong>"
      values={{
        count: items.length,
        strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
      }}
    />
  );

  // The live region stays mounted across the empty/results swap: a region that
  // mounts already holding its text is not reliably announced.
  return (
    <>
      <EuiScreenReaderLive>{isEmpty ? emptyLabel : countContent}</EuiScreenReaderLive>
      {isEmpty ? (
        <EuiEmptyPrompt
          titleSize="xs"
          data-test-subj="addDataSearchResultsEmpty"
          title={<h4>{emptyLabel}</h4>}
        />
      ) : (
        <section aria-labelledby={countId} data-test-subj="addDataSearchResults">
          <EuiText size="s" color="subdued" id={countId} data-test-subj="addDataSearchResultsCount">
            {countContent}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGrid columns={COLUMNS} gutterSize="m">
            {items.map((item) => (
              <EuiFlexItem key={item.id}>{renderCard(item)}</EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </section>
      )}
    </>
  );
}
