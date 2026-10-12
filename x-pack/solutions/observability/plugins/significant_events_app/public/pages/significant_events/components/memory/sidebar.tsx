/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getMemoryFilterLabel } from './labels';
import type { MemoryFilter, MemorySidebarSelection, MemorySummary } from './types';
import { MEMORY_FILTERS } from './types';

interface MemorySidebarProps {
  filter: MemoryFilter;
  onFilterChange: (filter: MemoryFilter) => void;
  selection: MemorySidebarSelection;
  onSelect: (selection: MemorySidebarSelection) => void;
  pages: MemorySummary[];
  isLoading: boolean | undefined;
  isError: boolean | undefined;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean | undefined;
  onLoadMore: () => void;
  onSearchChange: (search: string) => void;
}

/** Wait for a pause in typing before asking the server, so each keystroke is not a request. */
export const MEMORY_SEARCH_DEBOUNCE_MS = 300;

export function MemorySidebar({
  filter,
  onFilterChange,
  selection,
  onSelect,
  pages,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSearchChange,
}: MemorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(searchQuery), MEMORY_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearchChange]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      data-test-subj="nightshiftMemorySidebar"
      className={css`
        height: 100%;
        min-height: 0;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFieldSearch
          compressed
          incremental
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={i18n.translate('xpack.significantEventsApp.memory.searchPlaceholder', {
            defaultMessage: 'Search memories',
          })}
          aria-label={i18n.translate('xpack.significantEventsApp.memory.searchAriaLabel', {
            defaultMessage: 'Search Semantic Memory',
          })}
          data-test-subj="nightshiftMemorySearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={i18n.translate('xpack.significantEventsApp.memory.filterLegend', {
            defaultMessage: 'Memory filter',
          })}
          options={MEMORY_FILTERS.map((value) => ({
            id: value,
            label: getMemoryFilterLabel(value),
            'data-test-subj': `nightshiftMemoryFilter-${value}`,
          }))}
          idSelected={filter}
          onChange={(id) => onFilterChange(id as MemoryFilter)}
          buttonSize="compressed"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiListGroup maxWidth={false}>
          <EuiListGroupItem
            iconType="home"
            label={
              <FormattedMessage
                id="xpack.significantEventsApp.memory.homeNavLabel"
                defaultMessage="Home"
              />
            }
            isActive={selection.kind === 'home'}
            onClick={() => onSelect({ kind: 'home' })}
            data-test-subj="nightshiftMemoryHomeNav"
          />
          <EuiListGroupItem
            iconType="clock"
            label={
              <FormattedMessage
                id="xpack.significantEventsApp.memory.activityNavLabel"
                defaultMessage="Activity"
              />
            }
            isActive={selection.kind === 'activity'}
            onClick={() => onSelect({ kind: 'activity' })}
            data-test-subj="nightshiftMemoryActivityNav"
          />
        </EuiListGroup>
      </EuiFlexItem>
      <EuiFlexItem
        className={css`
          overflow-y: auto;
          min-height: 0;
        `}
      >
        {isLoading ? (
          <EuiLoadingSpinner size="m" data-test-subj="nightshiftMemorySidebarLoading" />
        ) : isError ? (
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="xpack.significantEventsApp.memory.listError"
              defaultMessage="Could not load memories."
            />
          </EuiText>
        ) : pages.length === 0 ? (
          <EuiText size="xs" color="subdued" data-test-subj="nightshiftMemorySidebarEmpty">
            {searchQuery.length > 0 ? (
              <FormattedMessage
                id="xpack.significantEventsApp.memory.noSearchResults"
                defaultMessage="No memories match that search."
              />
            ) : (
              <FormattedMessage
                id="xpack.significantEventsApp.memory.emptyDescription"
                defaultMessage="No memories yet. The investigator writes them after a run."
              />
            )}
          </EuiText>
        ) : (
          <EuiListGroup
            maxWidth={false}
            className={css`
              .euiListGroupItem__label {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            `}
          >
            {pages.map((page) => (
              <EuiListGroupItem
                key={page.id}
                label={page.title}
                isActive={selection.kind === 'page' && selection.id === page.id}
                onClick={() => onSelect({ kind: 'page', id: page.id })}
                data-test-subj={`nightshiftMemoryLink-${page.id}`}
              />
            ))}
          </EuiListGroup>
        )}
      </EuiFlexItem>
      {hasNextPage && (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fullWidth
            isLoading={isFetchingNextPage}
            onClick={onLoadMore}
            data-test-subj="nightshiftMemoryLoadMore"
          >
            <FormattedMessage
              id="xpack.significantEventsApp.memory.loadMore"
              defaultMessage="Load more"
            />
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
