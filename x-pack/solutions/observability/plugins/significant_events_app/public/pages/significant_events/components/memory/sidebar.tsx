/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
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
import { useMemoryPages } from './use_memory';
import { MEMORY_FILTERS, type MemoryFilter, type MemorySidebarSelection } from './types';

interface MemorySidebarProps {
  filter: MemoryFilter;
  onFilterChange: (filter: MemoryFilter) => void;
  selection: MemorySidebarSelection;
  onSelect: (selection: MemorySidebarSelection) => void;
}

const matchesSearch = (title: string, context: string | undefined, query: string): boolean => {
  if (query.length === 0) return true;
  return `${title} ${context ?? ''}`.toLowerCase().includes(query.toLowerCase());
};

export function MemorySidebar({ filter, onFilterChange, selection, onSelect }: MemorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { rows, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMemoryPages(filter);

  // The list is already paginated server-side, so this only narrows what has
  // been fetched rather than pretending to search the whole store.
  const visible = useMemo(
    () => rows.filter((page) => matchesSearch(page.title, page.context, searchQuery)),
    [rows, searchQuery]
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
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
        ) : visible.length === 0 ? (
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
            {visible.map((page) => (
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
            onClick={() => fetchNextPage()}
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
