/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getESQLResults } from '@kbn/esql-utils';
import { useKibana } from '../../../common/lib/kibana';

export interface UseEpisodeAssigneesResult {
  /** Current assignee per `episode.id` (null = explicitly unassigned, absent = never assigned). */
  assignees: Map<string, string | null>;
  /** Re-runs the lookup — used after an `assign` action, since the episode-id set is unchanged. */
  refetch: () => void;
}

/**
 * The `$.alert-episodes` view is `FROM .rule-events` only, so episode rows don't carry the current
 * assignee. We side-fetch it: one ES|QL query over `.alert-actions` for the visible episodes,
 * folding `assign` actions into the latest `assignee_uid` per episode (null = explicitly unassigned).
 *
 * Returns a map keyed by `episode.id`. Mirrors the rule-name cache pattern — a small companion
 * lookup that keeps the primary table query on the view.
 */
export const useEpisodeAssignees = (episodeIds: string[]): UseEpisodeAssigneesResult => {
  const {
    services: { data },
  } = useKibana();

  const [assignees, setAssignees] = useState<Map<string, string | null>>(new Map());
  const [refreshToken, setRefreshToken] = useState(0);
  const abortRef = useRef<AbortController>();

  // Stable dependency: the set of ids, order-independent (the query groups BY episode_id anyway).
  const idsKey = Array.from(new Set(episodeIds)).sort().join(',');

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (!ids.length) {
      setAssignees(new Map());
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const inList = ids.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(', ');
    const esqlQuery =
      `FROM .alert-actions` +
      ` | WHERE action_type == "assign" AND episode_id IN (${inList})` +
      ` | STATS last_assignee_uid = LAST(assignee_uid, @timestamp) BY episode_id`;

    (async () => {
      try {
        const { response } = await getESQLResults({
          esqlQuery,
          search: data.search.search,
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }
        const columnNames = response.columns.map((column) => column.name);
        const episodeIdIndex = columnNames.indexOf('episode_id');
        const assigneeIndex = columnNames.indexOf('last_assignee_uid');
        const next = new Map<string, string | null>();
        response.values.forEach((row) => {
          const episodeId = row[episodeIdIndex] as string | undefined;
          if (episodeId) {
            next.set(episodeId, (row[assigneeIndex] as string | null) ?? null);
          }
        });
        setAssignees(next);
      } catch {
        if (!controller.signal.aborted) {
          setAssignees(new Map());
        }
      }
    })();

    return () => controller.abort();
  }, [idsKey, data.search.search, refreshToken]);

  const refetch = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { assignees, refetch };
};
