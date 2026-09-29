/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MemoryPageRow } from './page_row';
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
  const recentlyUpdated = useMemo(
    () =>
      [...pages].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, RECENT_COUNT),
    [pages]
  );

  // Confidence is the tie-breaker, not the headline: a memory shown once and
  // marked useful has a rate of 1.0 and a confidence near zero, so sorting on
  // usefulness alone would put a fluke at the top.
  const mostUseful = useMemo(
    () =>
      [...pages]
        .filter((page) => !page.archived)
        .sort((a, b) => b.usefulness * b.confidence - a.usefulness * a.confidence)
        .slice(0, MOST_USEFUL_COUNT),
    [pages]
  );

  const total = stats?.total ?? 0;
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
        {stats?.decayed_impressions !== undefined && stats.decayed_impressions > 0 && (
          <>
            {' · '}
            <FormattedMessage
              id="xpack.significantEventsApp.memory.stats.recallLabel"
              defaultMessage="{count, plural, one {recalled once} other {recalled # times}}"
              values={{ count: Math.round(stats.decayed_impressions) }}
            />
          </>
        )}
      </EuiText>

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
