/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import { useMemoryClient } from './use_memory';
import type { MemoryPage } from './types';

interface LineageCrumb {
  id: string;
  title: string;
  usefulness: number;
  archived: boolean;
  /** 1 for a direct merge source, 2 for one of *its* sources, and so on. */
  level: number;
}

/**
 * Fetches the whole chain in one request.
 *
 * The server walks `merged_from` breadth-first with a bounded, cycle-safe
 * `mget` per level, so the browser never issues a request per ancestor. The
 * server cap is authoritative — the client cannot ask for an unbounded walk.
 */
const useLineage = (page: MemoryPage | undefined) => {
  const client = useMemoryClient();
  const id = page?.id;
  const hasParents = (page?.merged_from?.length ?? 0) > 0;

  const { data } = useQuery({
    queryKey: ['nightshift', 'memory', 'lineage', id],
    queryFn: ({ signal }) =>
      client!.fetch('GET /internal/nightshift/memory/pages/{id}/lineage', {
        signal: signal ?? null,
        params: { path: { id: id! } },
      }) as Promise<{ ancestors?: LineageCrumb[] }>,
    enabled: client !== undefined && id !== undefined && hasParents,
    // Lineage is supplementary: a failure must not break the page, and nothing
    // on it is worth retrying.
    retry: false,
  });

  return data?.ancestors ?? [];
};

interface MemoryLineageProps {
  page: MemoryPage | undefined;
  onSelectPage: (id: string) => void;
}

/**
 * The trail of memories this one was merged from.
 *
 * Each ancestor is a real document — the optimizer archives merge sources
 * rather than deleting them — so the chain is navigable all the way back, which
 * is the thing a flat list of source ids cannot do.
 */
export function MemoryLineage({ page, onSelectPage }: MemoryLineageProps) {
  const crumbs = useLineage(page);

  // One row per level. A merge is a fan-in, so rendering the trail as a single
  // `›` chain would state that each ancestor came from the one before it — a
  // claim the data does not support.
  const levels = useMemo(() => groupByLevel(crumbs), [crumbs]);

  if (levels.length === 0 || !page) {
    return null;
  }

  return (
    <div
      data-test-subj="nightshiftMemoryLineage"
      className={css`
        margin-bottom: 12px;
      `}
    >
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.significantEventsApp.memory.lineage.heading"
          defaultMessage="Merge lineage"
        />
      </EuiText>
      <EuiSpacer size="xs" />
      {levels.map((level, index) => (
        <div
          key={level.level}
          data-test-subj={`nightshiftMemoryLineageLevel-${level.level}`}
          className={css`
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px;
            ${index > 0 ? 'margin-top: 4px;' : ''}
          `}
        >
          <EuiText
            size="xs"
            color="subdued"
            className={css`
              flex-shrink: 0;
            `}
          >
            {index === 0 ? (
              <FormattedMessage
                id="xpack.significantEventsApp.memory.lineage.levelFirst"
                defaultMessage="Merged from:"
              />
            ) : (
              <FormattedMessage
                id="xpack.significantEventsApp.memory.lineage.levelDeeper"
                defaultMessage="which merged from:"
              />
            )}
          </EuiText>
          {level.crumbs.map((crumb, crumbIndex) => (
            <React.Fragment key={crumb.id}>
              {crumbIndex > 0 && (
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.significantEventsApp.memory.lineage.separator"
                    defaultMessage=","
                  />
                </EuiText>
              )}
              <EuiLink
                onClick={() => onSelectPage(crumb.id)}
                data-test-subj={`nightshiftMemoryLineageCrumb-${crumb.id}`}
              >
                {crumb.title}
              </EuiLink>
              <EuiBadge color="hollow">
                <FormattedMessage
                  id="xpack.significantEventsApp.memory.lineage.mergedBadge"
                  defaultMessage="merged"
                />
              </EuiBadge>
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

interface LineageLevel {
  level: number;
  crumbs: LineageCrumb[];
}

/**
 * Buckets the ancestors the server returned into rows by level, in the order the
 * server emitted them.
 *
 * The server walks `merged_from` breadth-first and reports the level it reached
 * each ancestor at, so the grouping is the walk's own rather than a guess from
 * the ancestor list's order.
 */
export const groupByLevel = (crumbs: LineageCrumb[]): LineageLevel[] => {
  const byLevel = new Map<number, LineageCrumb[]>();
  for (const crumb of crumbs) {
    byLevel.set(crumb.level, [...(byLevel.get(crumb.level) ?? []), crumb]);
  }
  return [...byLevel.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, levelCrumbs]) => ({ level, crumbs: levelCrumbs }));
};
