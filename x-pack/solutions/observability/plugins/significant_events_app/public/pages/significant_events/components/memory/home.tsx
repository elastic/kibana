/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MemoryPageRow } from './page_row';
import { MemoryKeywordTreemap } from './keyword_treemap';
import { filterEntriesByKeywords, toTagFilterTerms } from './keyword_page_rank';
import { useMemoryKeywordPages } from './use_memory';
import type { MemoryStats, MemorySummary } from './types';

interface MemoryHomeProps {
  pages: MemorySummary[];
  stats: MemoryStats | undefined;
  onSelectPage: (id: string) => void;
}

/** A fixed, readable subset — enough to spot the standouts without a long scroll. */
const RECENT_COUNT = 8;
const MOST_USEFUL_COUNT = 3;

export function MemoryHome({ pages, stats, onSelectPage }: MemoryHomeProps) {
  // Canonical keywords the view is filtered by, in click order. Selecting two is
  // AND, so the chip row is the only statement of what is being filtered.
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  // The tab's own list is one page of the store, so the chart asks for its own
  // wider slice rather than describing whichever 25 rows happen to be loaded.
  // The unfiltered slice is also what resolves a keyword's spellings: tags are
  // stored verbatim, so the server has to be told every one of them.
  const { data: allKeywordResult } = useMemoryKeywordPages();
  const allKeywordPages = useMemo(() => allKeywordResult?.pages ?? [], [allKeywordResult]);
  const tagTerms = useMemo(
    () => toTagFilterTerms(allKeywordPages, selectedKeywords),
    [allKeywordPages, selectedKeywords]
  );
  const { data: keywordResult } = useMemoryKeywordPages(tagTerms);
  const keywordPages = useMemo(
    // With nothing selected both queries are the same one, so the unfiltered
    // slice is used directly rather than waiting on a second copy of it.
    () => (selectedKeywords.length === 0 ? allKeywordPages : keywordResult?.pages ?? []),
    [selectedKeywords, allKeywordPages, keywordResult]
  );

  const onToggleKeyword = useCallback((keyword: string) => {
    setSelectedKeywords((selected) =>
      selected.includes(keyword) ? selected.filter((k) => k !== keyword) : [...selected, keyword]
    );
  }, []);
  const onClearKeywords = useCallback(() => setSelectedKeywords([]), []);

  // The lists below describe the whole store, so they honour the selection too.
  // They filter the tab's own rows rather than the chart's wider slice: a list of
  // memories the sidebar cannot open is not a useful answer.
  const filteredPages = useMemo(
    () => filterEntriesByKeywords(pages, selectedKeywords),
    [pages, selectedKeywords]
  );

  const recentlyUpdated = useMemo(
    () =>
      [...filteredPages]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, RECENT_COUNT),
    [filteredPages]
  );

  // Confidence is the tie-breaker, not the headline: a memory shown once and
  // marked useful has a rate of 1.0 and a confidence near zero, so sorting on
  // usefulness alone would put a fluke at the top.
  const mostUseful = useMemo(
    () =>
      [...filteredPages]
        .filter((page) => !page.archived)
        .sort((a, b) => b.usefulness * b.confidence - a.usefulness * a.confidence)
        .slice(0, MOST_USEFUL_COUNT),
    [filteredPages]
  );

  // The header count follows the keyword selection, because the store-wide
  // number would describe memories the lists below are not showing. The archived
  // count stays store-wide: the archived list is not filtered by keywords.
  const total =
    (selectedKeywords.length > 0 ? keywordResult?.stats.total : stats?.total) ?? 0;
  const archived = stats?.archived ?? 0;

  return (
    <div data-test-subj="nightshiftMemoryHome">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.significantEventsApp.memory.homeTitle"
            defaultMessage="Semantic Memory"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.significantEventsApp.memory.homeDescription"
            defaultMessage="What the investigator has learned, and how much of it has held up."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
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

      <EuiSpacer size="l" />
      <MemoryKeywordTreemap
        pages={keywordPages}
        selectedKeywords={selectedKeywords}
        onToggleKeyword={onToggleKeyword}
        onClearKeywords={onClearKeywords}
      />

      {mostUseful.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.significantEventsApp.memory.mostUsefulTitle"
                defaultMessage="Most proven"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {mostUseful.map((page) => (
            <React.Fragment key={page.id}>
              <MemoryPageRow page={page} onSelectPage={onSelectPage} />
              <EuiHorizontalRule margin="s" />
            </React.Fragment>
          ))}
        </>
      )}

      {recentlyUpdated.length === 0 ? (
        // With nothing to list, the section heading would be a label with no
        // section under it, so the empty message stands on its own.
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.recentlyUpdatedEmpty"
            defaultMessage="No memories yet. The investigator writes them after a run."
          />
        </EuiText>
      ) : (
        <>
          <EuiTitle size="xxs">
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
