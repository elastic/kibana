/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiScreenReaderLive,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const COLUMNS = 3;
const VISIBLE_ROWS = 2;
const PAGE_SIZE = COLUMNS * VISIBLE_ROWS;

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
  const [pageIndex, setPageIndex] = useState(0);
  const [pagedTerm, setPagedTerm] = useState(searchTerm);
  const isNewTerm = pagedTerm !== searchTerm;
  // Reset during render (not an effect) so the stale page never paints for the new term.
  if (isNewTerm) {
    setPagedTerm(searchTerm);
    setPageIndex(0);
  }

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
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const lastPageIndex = Math.max(pageCount - 1, 0);
  // Clamp from the reset value, not the stale `pageIndex`: both writes land on this
  // same render pass and React applies them in order, so starting from `pageIndex`
  // here would let the shrink clamp overwrite the term-change reset above.
  const requestedPageIndex = isNewTerm ? 0 : pageIndex;
  const safePageIndex = Math.min(requestedPageIndex, lastPageIndex);
  if (pageIndex !== safePageIndex) {
    setPageIndex(safePageIndex);
  }
  const visibleItems = items.slice(safePageIndex * PAGE_SIZE, (safePageIndex + 1) * PAGE_SIZE);
  const from = safePageIndex * PAGE_SIZE + 1;
  const to = safePageIndex * PAGE_SIZE + visibleItems.length;
  const isPaginated = items.length > PAGE_SIZE;

  const emptyLabel = i18n.translate(
    'xpack.observability_onboarding.addDataGrid.searchResults.emptyTitle',
    { defaultMessage: 'No results for {searchTerm}', values: { searchTerm } }
  );
  const countContent = isPaginated ? (
    <FormattedMessage
      id="xpack.observability_onboarding.addDataGrid.searchResults.countHeaderPaginated"
      defaultMessage="Showing <strong>{from}-{to} of {total, plural, one {# integration} other {# integrations}}</strong>"
      values={{
        from,
        to,
        total: items.length,
        strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
      }}
    />
  ) : (
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
            {visibleItems.map((item) => (
              <EuiFlexItem key={item.id}>{renderCard(item)}</EuiFlexItem>
            ))}
          </EuiFlexGrid>
          {isPaginated && (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiPagination
                    aria-label={i18n.translate(
                      'xpack.observability_onboarding.addDataGrid.searchResults.paginationAriaLabel',
                      { defaultMessage: 'Search results pages' }
                    )}
                    pageCount={pageCount}
                    activePage={safePageIndex}
                    onPageClick={setPageIndex}
                    data-test-subj="addDataSearchResultsPagination"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </section>
      )}
    </>
  );
}
