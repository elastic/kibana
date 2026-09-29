/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
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
  const [selection, setSelection] = useState<MemorySidebarSelection>({ kind: 'home' });

  // Home and Activity both read the same list the sidebar does, so one query
  // serves all three panes rather than each fetching its own.
  const { rows, stats, isError, isLoading } = useMemoryPages(filter);
  const livePages = rows.filter((page) => !page.archived);

  if (isLoading) {
    return <div data-test-subj="nightshiftMemoryLoading" />;
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
              <MemoryHome pages={livePages} stats={stats} onSelectPage={onSelectPage} />
            )}
            {selection.kind === 'activity' && (
              <MemoryActivity pages={rows} onSelectPage={onSelectPage} />
            )}
            {selection.kind === 'page' && (
              <MemoryPageView
                pageId={selection.id}
                onSelectPage={onSelectPage}
                onDeleted={() => setSelection({ kind: 'home' })}
              />
            )}
          </div>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
