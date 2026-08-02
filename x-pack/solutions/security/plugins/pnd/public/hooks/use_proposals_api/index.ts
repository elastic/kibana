/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  PND_PROPOSALS_HISTORY_URL,
  PND_PROPOSALS_URL,
  buildProposalRespondUrl,
} from '@kbn/pnd-common';
import type {
  ListProposalsResponse,
  RespondToProposalRequestBody,
  RespondToProposalResponse,
} from '@kbn/pnd-common';
import { queryKeys } from '../../query_keys';
import { classifyQueryError } from '../../states';
import { readAttackDiscoveryWorkflowsEnabled } from '../read_attack_discovery_workflows_enabled';
import { retryOnTransientError } from '../retry_on_transient_error';

/**
 * `'approve' | 'dismiss'`, derived from the request contract rather than restated.
 *
 * The enum is closed server-side (security finding D2: a body carrying only a
 * rationale used to proceed as an **approval**, and so did a capitalized
 * `"Dismiss"`), so deriving it means a contract change breaks the UI's type check
 * instead of producing a 400 at demo time.
 */
export type PndProposalDecision = RespondToProposalRequestBody['input']['decision'];

/** An empty queue, for the response body a failed parse leaves undefined. */
const EMPTY_QUEUE: ListProposalsResponse = { groups: [], total: 0 };

export interface PndProposalsQueryResult {
  /**
   * `false` when the response said Attack Discovery 2.0 workflows are off in this
   * space — an empty queue by design rather than a bug — and `undefined` when the
   * server did not say, which is not the same claim as `false`.
   */
  isAttackDiscoveryWorkflowsEnabled?: boolean;
  proposals: ListProposalsResponse;
}

export interface UseProposalsOptions {
  /** `false` while the caller has nothing to read the queue for, e.g. a lifecycle with no discovery id. */
  enabled?: boolean;
}

/**
 * `GET /internal/pnd/proposals` — the grouped HITL queue.
 *
 * The **only** PND read that needs `asResponse: true`: the distinction between
 * "this space has no pending gates" and "Attack Discovery 2.0 is off in this
 * space, so the loop never starts" is carried by a response *header*, because the
 * body is a closed generated shape with nowhere to put it. Reading the body alone
 * makes a configuration state look like an empty queue.
 *
 * A 503 (`workflowsManagement.management` not wired — the expected status on any
 * non-task-enabled dev stack) surfaces as an error, never as an empty queue.
 *
 * This is the **only** producer for `queryKeys.proposals.list()`. React Query caches by key rather
 * than by hook, so the first observer to mount is the one whose `queryFn` runs and every other
 * observer reads its result. A second hook reading the same route under this key would therefore
 * hand one of the two surfaces a shape it cannot parse, depending only on mount order. Every
 * consumer goes through this hook for that reason — see `useTuningProposal`.
 */
export const useProposals = ({ enabled = true }: UseProposalsOptions = {}) => {
  const { services } = useKibana();

  return useQuery({
    enabled,
    keepPreviousData: true,
    queryKey: queryKeys.proposals.list(),
    queryFn: async (): Promise<PndProposalsQueryResult> => {
      const { body, response } = await services.http!.get<ListProposalsResponse>(
        PND_PROPOSALS_URL,
        {
          asResponse: true,
          version: API_VERSIONS.internal.v1,
        }
      );

      return {
        isAttackDiscoveryWorkflowsEnabled: readAttackDiscoveryWorkflowsEnabled(response),
        proposals: body ?? EMPTY_QUEUE,
      };
    },
    retry: retryOnTransientError,
  });
};

/**
 * `GET /internal/pnd/proposals/history` — the answered gates, in the queue's own shape.
 *
 * Reads the same `PndProposalsQueryResult` as {@link useProposals}, under its own cache key: the two
 * reads scan different execution statuses, and sharing a key would make whichever tab mounted first
 * decide what the other one renders. The Attack Discovery 2.0 header is read here too, because an
 * empty history in a space where the loop never started is a configuration state, not a lack of
 * approvals.
 */
export const useProposalHistory = ({ enabled = true }: UseProposalsOptions = {}) => {
  const { services } = useKibana();

  return useQuery({
    enabled,
    keepPreviousData: true,
    queryKey: queryKeys.proposals.history(),
    queryFn: async (): Promise<PndProposalsQueryResult> => {
      const { body, response } = await services.http!.get<ListProposalsResponse>(
        PND_PROPOSALS_HISTORY_URL,
        {
          asResponse: true,
          version: API_VERSIONS.internal.v1,
        }
      );

      return {
        isAttackDiscoveryWorkflowsEnabled: readAttackDiscoveryWorkflowsEnabled(response),
        proposals: body ?? EMPTY_QUEUE,
      };
    },
    retry: retryOnTransientError,
  });
};

export interface RespondToProposalParams {
  /**
   * The gate's answer, exactly as `_respond` should receive it as its `input`.
   *
   * Passed through rather than rebuilt from known keys. A gate's own `inputSchema`
   * declares what answering it means, and the route's `.catchall(z.unknown())`
   * hands whatever it asked for to the orchestrator untouched — so a mutation
   * that reassembled the body from `{ decision, rationale }` would silently drop
   * every schema-driven field, which is the one failure mode nobody would see.
   *
   * `decision` and a non-empty `rationale` are still required, and are checked
   * here rather than only in the type: the values come from a form, so the
   * compiler cannot promise either one.
   */
  input: Record<string, unknown>;
  /** `workflowId:workflowRunId:stepExecutionId`; it contains colons. */
  sourceId: string;
}

/** The rationale as the route requires it: text, non-empty after trim. */
const readTrimmedRationale = (input: Record<string, unknown>): string => {
  const { rationale } = input;

  if (typeof rationale !== 'string' || rationale.trim().length === 0) {
    throw new Error('a non-empty rationale is required');
  }

  return rationale.trim();
};

/**
 * `POST /internal/pnd/proposals/{sourceId}/_respond` — answer one pending gate.
 *
 * Three things are deliberate:
 *
 * - The url comes from `buildProposalRespondUrl`, never concatenation: a
 *   `sourceId` is `workflowId:workflowRunId:stepExecutionId`, and the builder
 *   encodes it.
 * - `rationale` is trimmed and refused when blank **before** the request. The
 *   route rejects a blank one anyway; failing here keeps the analyst's typed text
 *   and the reason on screen instead of turning it into a 400 toast.
 * - Success invalidates the proposals queue **and** the runs list, because the
 *   response is only `{ sourceId, resumed }` — there is no new run id to key a
 *   targeted update off. A 409 or 404 invalidates the queue too: both mean the
 *   row on screen is stale. Any other failure leaves the cache alone, because a
 *   403 says nothing about whether the gate is still pending.
 */
export const useRespondToProposal = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      sourceId,
    }: RespondToProposalParams): Promise<RespondToProposalResponse> => {
      const rationale = readTrimmedRationale(input);

      return services.http!.post<RespondToProposalResponse>(buildProposalRespondUrl(sourceId), {
        // spread first, so the trimmed rationale replaces the untrimmed one rather
        // than being overwritten by it
        body: JSON.stringify({ input: { ...input, rationale } }),
        version: API_VERSIONS.internal.v1,
      });
    },
    onError: async (error: unknown) => {
      const kind = classifyQueryError(error);

      if (kind === 'conflict' || kind === 'notFound') {
        await queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
    },
  });
};
