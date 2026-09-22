/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
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

// Provisional pending final designs: two rows of three cards, then a Show more
// button. Page size is a prop so a host can shrink it in a narrower slot.
const DEFAULT_PAGE_SIZE = 6;
const COLUMNS = 3;

export interface AddDataSearchResultsProps<TItem extends { id: string }> {
  searchTerm: string;
  items: readonly TItem[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  renderCard: (item: TItem) => React.ReactNode;
  pageSize?: number;
}

export function AddDataSearchResults<TItem extends { id: string }>({
  searchTerm,
  items,
  isLoading,
  isError = false,
  onRetry,
  renderCard,
  pageSize = DEFAULT_PAGE_SIZE,
}: AddDataSearchResultsProps<TItem>) {
  const countId = useGeneratedHtmlId({ prefix: 'addDataSearchResultsCount' });
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [previousSearchTerm, setPreviousSearchTerm] = useState(searchTerm);
  const [previousPageSize, setPreviousPageSize] = useState(pageSize);

  // Adjusted during render, not in an effect: an effect resets one commit too
  // late, so extra cards flash and can log usage impressions on mount.
  if (searchTerm !== previousSearchTerm || pageSize !== previousPageSize) {
    setPreviousSearchTerm(searchTerm);
    setPreviousPageSize(pageSize);
    setVisibleCount(pageSize);
    setFocusIndex(null);
  }

  // The last Show more click unmounts the button, which would drop focus to the
  // document body. Move it onto the first card the click revealed instead.
  const focusRevealedCard = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);

  const showMore = () => {
    setFocusIndex(visibleCount);
    setVisibleCount((count) => count + pageSize);
  };

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
  const countLabel = i18n.translate(
    'xpack.observability_onboarding.addDataGrid.searchResults.countHeader',
    {
      defaultMessage: 'Showing {count, plural, one {# result} other {# results}}',
      values: { count: items.length },
    }
  );
  const visibleItems = items.slice(0, visibleCount);

  // The live region stays mounted across the empty/results swap: a region that
  // mounts already holding its text is not reliably announced.
  return (
    <>
      <EuiScreenReaderLive>{isEmpty ? emptyLabel : countLabel}</EuiScreenReaderLive>
      {isEmpty ? (
        <EuiEmptyPrompt
          titleSize="xs"
          data-test-subj="addDataSearchResultsEmpty"
          title={<h4>{emptyLabel}</h4>}
        />
      ) : (
        <section aria-labelledby={countId} data-test-subj="addDataSearchResults">
          <EuiText size="s" id={countId} data-test-subj="addDataSearchResultsCount">
            <strong>{countLabel}</strong>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGrid columns={COLUMNS} gutterSize="m">
            {visibleItems.map((item, index) => {
              const isFocusTarget = index === focusIndex;
              return (
                <EuiFlexItem
                  key={item.id}
                  ref={isFocusTarget ? focusRevealedCard : undefined}
                  tabIndex={isFocusTarget ? -1 : undefined}
                >
                  {renderCard(item)}
                </EuiFlexItem>
              );
            })}
          </EuiFlexGrid>
          {visibleCount < items.length && (
            <>
              <EuiSpacer size="m" />
              <EuiButtonEmpty
                onClick={showMore}
                iconType="arrowDown"
                data-test-subj="addDataSearchResultsShowMore"
              >
                <FormattedMessage
                  id="xpack.observability_onboarding.addDataGrid.searchResults.showMoreButtonLabel"
                  defaultMessage="Show more"
                />
              </EuiButtonEmpty>
            </>
          )}
        </section>
      )}
    </>
  );
}
