/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
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
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../../../hooks/use_kibana';
import { WikiActivity } from './activity';
import { WikiHome } from './home';
import { WikiPageView } from './page_view';
import { WikiSidebar, type WikiSidebarSelection } from './sidebar';
import { useWikiPages } from './use_wiki';
import type { WikiStatusFilter } from './types';

export function WikiTab() {
  const { euiTheme } = useEuiTheme();
  const { nightshift } = useKibana().services.application.capabilities;
  const { canManage } = getNightshiftCapabilities(nightshift);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WikiStatusFilter>('all');
  const [selection, setSelection] = useState<WikiSidebarSelection>({ kind: 'home' });
  const [archiveCount, setArchiveCount] = useState(0);
  const homeTitleRef = useRef<HTMLHeadingElement>(null);
  const { data, isLoading, isError } = useWikiPages();

  // Archiving unmounts the focused page view, so hand focus to the home heading that replaces it.
  useEffect(() => {
    if (archiveCount > 0) {
      homeTitleRef.current?.focus();
    }
  }, [archiveCount]);

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" data-test-subj="nightshiftWikiLoading" />;
  }

  if (isError) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.loadErrorTitle"
              defaultMessage="Could not load Wiki"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.loadErrorDescription"
              defaultMessage="The Wiki could not be loaded. Confirm nightshift investigations are enabled and refresh the page."
            />
          </p>
        }
      />
    );
  }

  const pages = data?.pages ?? [];
  const stats = data?.stats ?? { total: 0, established: 0, total_corroborations: 0 };

  return (
    <EuiFlexGroup
      gutterSize="l"
      alignItems="stretch"
      className={css`
        min-height: 520px;
        height: calc(100vh - 220px);
      `}
      data-test-subj="nightshiftWikiTab"
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
          <WikiSidebar
            pages={pages}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
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
              <WikiHome
                pages={pages}
                stats={stats}
                onSelectPage={(id) => setSelection({ kind: 'page', id })}
                titleRef={homeTitleRef}
              />
            )}
            {selection.kind === 'activity' && (
              <WikiActivity
                pages={pages}
                onSelectPage={(id) => setSelection({ kind: 'page', id })}
              />
            )}
            {selection.kind === 'page' && (
              <WikiPageView
                key={selection.id}
                pageId={selection.id}
                canManage={canManage}
                onArchived={() => {
                  setSelection({ kind: 'home' });
                  setArchiveCount((count) => count + 1);
                }}
              />
            )}
          </div>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
