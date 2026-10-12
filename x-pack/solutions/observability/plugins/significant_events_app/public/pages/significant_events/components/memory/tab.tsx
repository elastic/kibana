/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import { MemoryActivity } from './activity';
import { MemoryHome } from './home';
import { MemoryPageView } from './page_view';
import { MemorySidebar } from './sidebar';
import { useMemoryPages } from './use_memory';
import type { MemoryFilter, MemorySidebarSelection } from './types';

export function MemoryTab() {
  const { euiTheme } = useEuiTheme();
  const [filter, setFilter] = useState<MemoryFilter>('active');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<MemorySidebarSelection>({ kind: 'home' });
  // Home doesn't own this: a tag clicked on the detail view also selects a keyword.
  const [keywords, setKeywords] = useState<string[]>([]);

  const { data, rows, stats, isError, isLoading } = useMemoryPages(filter);
  const sidebar = useMemoryPages(filter, search);
  // A filter change reloads the query; unmounting the sidebar then would drop its search.
  const hasLoadedRef = useRef(false);
  if (data !== undefined) hasLoadedRef.current = true;
  const livePages = useMemo(() => rows.filter((page) => !page.archived), [rows]);
  const onToggleKeyword = useCallback((keyword: string) => {
    setKeywords((selected) =>
      selected.includes(keyword) ? selected.filter((k) => k !== keyword) : [...selected, keyword]
    );
  }, []);
  const onClearKeywords = useCallback(() => setKeywords([]), []);
  const onSelectKeyword = useCallback((keyword: string) => {
    setKeywords([keyword]);
    setSelection({ kind: 'home' });
  }, []);

  if (isLoading && !hasLoadedRef.current) {
    return <EuiLoadingSpinner size="xl" data-test-subj="nightshiftMemoryLoading" />;
  }

  if (isError) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.significantEventsApp.memory.loadErrorTitle"
              defaultMessage="Could not load Semantic Memory"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.significantEventsApp.memory.loadErrorDescription"
              defaultMessage="Confirm Nightshift investigations are enabled and refresh the page."
            />
          </p>
        }
      />
    );
  }

  const onSelectPage = (id: string) => setSelection({ kind: 'page', id });

  return (
    <EuiFlexGroup
      gutterSize="l"
      alignItems="stretch"
      className={css`
        min-height: 520px;
        height: calc(100vh - 220px);
      `}
      data-test-subj="nightshiftMemoryTab"
    >
      <EuiFlexItem
        grow={false}
        className={css`
          width: 280px;
        `}
      >
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="m"
          className={css`
            height: 100%;
            min-height: 0;
            overflow: hidden;
          `}
        >
          <MemorySidebar
            filter={filter}
            onFilterChange={setFilter}
            selection={selection}
            onSelect={setSelection}
            pages={sidebar.rows}
            isLoading={sidebar.isLoading}
            isError={sidebar.isError}
            hasNextPage={sidebar.hasNextPage}
            isFetchingNextPage={sidebar.isFetchingNextPage}
            onLoadMore={() => sidebar.fetchNextPage()}
            onSearchChange={setSearch}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          className={css`
            height: 100%;
            min-height: 0;
            overflow: hidden;
          `}
        >
          <div
            className={css`
              height: 100%;
              min-height: 0;
              overflow-y: auto;
              padding: ${euiTheme.size.l};
            `}
          >
            {selection.kind === 'home' && (
              <MemoryHome
                pages={livePages}
                stats={stats}
                onSelectPage={onSelectPage}
                selectedKeywords={keywords}
                onToggleKeyword={onToggleKeyword}
                onClearKeywords={onClearKeywords}
              />
            )}
            {selection.kind === 'activity' && (
              <MemoryActivity pages={rows} onSelectPage={onSelectPage} />
            )}
            {selection.kind === 'page' && (
              <MemoryPageView
                pageId={selection.id}
                onSelectPage={onSelectPage}
                onSelectKeyword={onSelectKeyword}
                onDeleted={() => setSelection({ kind: 'home' })}
              />
            )}
          </div>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
