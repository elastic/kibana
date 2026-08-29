/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, buildExecutionUrl } from '@kbn/pnd-common';
import type { GetExecutionResponse } from '@kbn/pnd-common';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../common/constants';
import { queryKeys } from '../../query_keys';
import { readPndSignalHeader } from '../read_pnd_signal_header';
import { retryOnTransientError } from '../retry_on_transient_error';

/**
 * One entry of the Watch Floor's per-action containment execution ledger, narrowed from the loose
 * `Record<string, unknown>` the route projects out of `collect_executed_actions`.
 */
export interface PndContainmentActionRecord {
  /** The kind of containment executed, e.g. `isolate_host`. */
  actionType?: string;
  /** A compact rendering of the ledger's `error`, when the execution recorded one. */
  errorMessage?: string;
  /** Why the action was skipped or left unexecuted, when the ledger says. */
  reason?: string;
  /**
   * The raw ledger status — `succeeded | submitted | failed | skipped | not_executed` today, kept
   * as a string so a widened ledger renders conservatively instead of being dropped.
   * `ContainmentActionStatusBadge` owns the presentation and its unknown fallback.
   */
  status: string;
  title: string;
}

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

/**
 * The ledger's `error` is connector-authored and untyped, so only the shapes that yield a compact
 * human-readable message are surfaced: a string, or an object carrying a string `message`. Anything
 * else stays a bare `failed` badge rather than a JSON dump on the row.
 */
const asErrorMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return asNonEmptyString(value);
  }

  if (typeof value === 'object' && value !== null && 'message' in value) {
    return asErrorMessage((value as { message: unknown }).message);
  }

  return undefined;
};

/**
 * Narrows the loose ledger entries row by row. An entry keeps its row as long as it carries a
 * status and something to call it — `title`, falling back to `action_type` — because the status is
 * the fact the lifecycle exists to surface; an entry with neither could only render blank and is
 * dropped instead.
 */
export const readContainmentActions = (
  entries: GetExecutionResponse['containmentActions']
): PndContainmentActionRecord[] =>
  (entries ?? []).flatMap((entry) => {
    const actionType = asNonEmptyString(entry.action_type);
    const status = asNonEmptyString(entry.status);
    const title = asNonEmptyString(entry.title) ?? actionType;

    if (status == null || title == null) {
      return [];
    }

    const errorMessage = asErrorMessage(entry.error);
    const reason = asNonEmptyString(entry.reason);

    return [
      {
        ...(actionType != null ? { actionType } : {}),
        ...(errorMessage != null ? { errorMessage } : {}),
        ...(reason != null ? { reason } : {}),
        status,
        title,
      },
    ];
  });

export interface PndExecutionQueryResult {
  /**
   * The per-action containment execution ledger, narrowed row by row. `[]` both when the route
   * sent none — the containment gate has not been answered yet — and when no entry survived the
   * narrowing.
   */
  containmentActions: PndContainmentActionRecord[];
  /** The always-complete 14-row four-phase skeleton. */
  execution: GetExecutionResponse;
  /**
   * `false` when the server found **no** run of any correlated workflow for this
   * discovery, `true` when it found one, and `undefined` when it did not say —
   * which is not the same claim as `false`.
   */
  isCorrelated?: boolean;
}

/**
 * `GET /internal/pnd/executions/{correlationId}` — the four-phase projection of one
 * Attack Discovery, as a flat `steps` array covering every catalog row.
 *
 * Read with `asResponse: true` because the interesting fact is in a **header**. The body is always
 * the complete 14-row skeleton — there is no empty response and no count — so "no run correlated to
 * this discovery" and "a run exists and has not reached these rows yet" are the same body. They are
 * told apart by `x-pnd-execution-correlated`, and only by it: correlation scans a bounded window of
 * recent executions per workflow with no date bounds, so an older discovery legitimately correlates
 * to nothing, and a brand-new run legitimately shows an all-`not_started` skeleton. Rendering the
 * "could not correlate" screen for the second case would be a lie about a healthy run.
 *
 * Disabled without a discovery id rather than throwing, so the lifecycle view can render its own
 * "open this from a discovery" guidance without a failed query behind it. The route resolves the
 * discovery **as the calling user** and answers `404` when it is not readable, so a `404` here means
 * "not yours or not there", never "no lifecycle".
 */
export const usePndExecution = (
  correlationId: string | undefined
): UseQueryResult<PndExecutionQueryResult> => {
  const { services } = useKibana();

  return useQuery({
    enabled: Boolean(correlationId),
    queryFn: async (): Promise<PndExecutionQueryResult> => {
      if (!correlationId) {
        throw new Error('correlationId is required');
      }

      const { body, response } = await services.http!.get<GetExecutionResponse>(
        buildExecutionUrl(correlationId),
        {
          asResponse: true,
          version: API_VERSIONS.internal.v1,
        }
      );

      return {
        containmentActions: readContainmentActions(body?.containmentActions),
        execution: body ?? { correlationId, steps: [] },
        isCorrelated: readPndSignalHeader(response, PND_EXECUTION_CORRELATED_HEADER),
      };
    },
    queryKey: queryKeys.executions.detail(correlationId),
    retry: retryOnTransientError,
  });
};
