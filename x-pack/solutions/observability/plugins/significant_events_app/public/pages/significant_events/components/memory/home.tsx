/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MemoryPageRow } from './page_row';
import { MemoryKeywordTreemap } from './keyword_treemap';
import { useMemoryKeywordPages } from './use_memory';
import type { MemoryStats, MemorySummary } from './types';

interface MemoryHomeProps {
  pages: MemorySummary[];
  stats: MemoryStats | undefined;
  onSelectPage: (id: string) => void;
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  onClearKeywords: () => void;
}

/** Enough to spot the standouts without a long scroll. */
const RECENT_COUNT = 8;
const MOST_USEFUL_COUNT = 3;

export function MemoryHome({
  pages,
  stats,
  onSelectPage,
  selectedKeywords,
  onToggleKeyword,
  onClearKeywords,
}: MemoryHomeProps) {
  const {
    data: keywordResult,
    isLoading: isKeywordLoading,
    isError: isKeywordError,
  } = useMemoryKeywordPages(selectedKeywords);
  const isFiltering = selectedKeywords.length > 0;
  const keywordStatus = !isFiltering
    ? 'ready'
    : isKeywordError
    ? 'error'
    : isKeywordLoading
    ? 'loading'
    : 'ready';
  const keywordPages = useMemo(() => keywordResult?.pages ?? [], [keywordResult]);

  const filteredPages = useMemo(
    () => (selectedKeywords.length === 0 ? pages : keywordPages),
    [pages, selectedKeywords, keywordPages]
  );

  const recentlyUpdated = useMemo(
    () =>
      [...filteredPages]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, RECENT_COUNT),
    [filteredPages]
  );

  // Confidence is the tie-breaker: a rate of 1.0 shown once has near-zero confidence.
  const mostUseful = useMemo(
    () =>
      [...filteredPages]
        .filter((page) => !page.archived && page.usefulness * page.confidence > 0)
        .sort((a, b) => b.usefulness * b.confidence - a.usefulness * a.confidence)
        .slice(0, MOST_USEFUL_COUNT),
    [filteredPages]
  );

  // The header total follows the keyword selection; `archived` does not, because the
  // sidebar's Archived list is not keyword-filtered, so `stats` is the tab's unfiltered one.
  const total = (selectedKeywords.length > 0 ? keywordResult?.stats?.total : stats?.total) ?? 0;
  const archived = stats?.archived ?? 0;

  return (
    <div data-test-subj="nightshiftMemoryHome">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.significantEventsApp.memory.homeTitle"
                defaultMessage="Semantic Memory"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="nightshiftMemoryHomeStats">
            <FormattedMessage
              id="xpack.significantEventsApp.memory.stats.pagesLabel"
              defaultMessage="{count, plural, one {# memory} other {# memories}}"
              values={{ count: total }}
            />
            {' · '}
            <FormattedMessage
              id="xpack.significantEventsApp.memory.stats.archivedLabel"
              defaultMessage="{count} archived"
              values={{ count: archived }}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <MemoryKeywordTreemap
        pages={keywordPages}
        selectedKeywords={selectedKeywords}
        onToggleKeyword={onToggleKeyword}
        onClearKeywords={onClearKeywords}
      />

      {keywordResult?.capped && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued" data-test-subj="nightshiftMemoryKeywordCap">
            <FormattedMessage
              id="xpack.significantEventsApp.memory.keywordCap"
              defaultMessage="Ranking covers the newest {count} memories."
              values={{ count: keywordPages.length }}
            />
          </EuiText>
        </>
      )}

      {keywordStatus === 'error' && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="warning"
            title={
              <FormattedMessage
                id="xpack.significantEventsApp.memory.keywordErrorTitle"
                defaultMessage="Could not load the memories for this keyword"
              />
            }
            data-test-subj="nightshiftMemoryKeywordError"
          />
        </>
      )}

      {keywordStatus === 'loading' && (
        <>
          <EuiSpacer size="m" />
          <EuiLoadingSpinner size="m" data-test-subj="nightshiftMemoryKeywordLoading" />
        </>
      )}

      {keywordStatus === 'ready' && mostUseful.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.significantEventsApp.memory.mostUsefulTitle"
                defaultMessage="Most proven"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {mostUseful.map((page, index) => (
            <React.Fragment key={page.id}>
              {index > 0 && <EuiHorizontalRule margin="s" />}
              <MemoryPageRow page={page} onSelectPage={onSelectPage} />
            </React.Fragment>
          ))}
        </>
      )}

      <EuiSpacer size="l" />
      {keywordStatus !== 'ready' ? null : recentlyUpdated.length === 0 ? (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.recentlyUpdatedEmpty"
            defaultMessage="No memories yet. The investigator writes them after a run."
          />
        </EuiText>
      ) : (
        <>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.significantEventsApp.memory.recentlyUpdatedTitle"
                defaultMessage="Recently updated"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {recentlyUpdated.map((page, index) => (
            <React.Fragment key={page.id}>
              {index > 0 && <EuiHorizontalRule margin="s" />}
              <MemoryPageRow page={page} onSelectPage={onSelectPage} />
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
}
