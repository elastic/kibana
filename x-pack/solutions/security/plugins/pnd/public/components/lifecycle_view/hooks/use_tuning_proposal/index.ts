/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useProposals } from '../../../../hooks/use_proposals_api';
import { readTuningEvidence, selectTuningProposal } from '../../helpers/read_tuning_evidence';
import type { PndTuningEvidence } from '../../helpers/read_tuning_evidence';

/**
 * The evidence behind the pending detection-tuning gate for one discovery, or `undefined` when there
 * is no such gate.
 *
 * Delegates to `useProposals` rather than reading `GET /internal/pnd/proposals` itself. Both
 * surfaces want one cache entry, and sharing `queryKeys.proposals.list()` between two `queryFn`s
 * that returned *different shapes* made the result depend on mount order: opening this overlay from
 * a queue row left the tuning evidence silently empty, while deep-linking the lifecycle first handed
 * the Brief page a body with no `proposals` key. Consuming the queue's own hook keeps the single
 * cache entry and makes that divergence impossible to reintroduce.
 *
 * The error is deliberately **not** surfaced: the tuning evidence enriches one row, so a failed or
 * forbidden proposals read must leave the other 25 rows rendering rather than replace the lifecycle
 * with an error.
 *
 * Only *pending* gates are listed, so this evidence is available exactly while the loop is parked at
 * 4.3 — which is when someone is deciding whether to approve it.
 */
export const useTuningProposal = (
  correlationId: string | undefined
): PndTuningEvidence | undefined => {
  const { data } = useProposals({ enabled: Boolean(correlationId) });

  return useMemo(() => {
    const proposal = selectTuningProposal({
      correlationId: correlationId ?? '',
      groups: data?.proposals.groups ?? [],
    });

    return proposal == null ? undefined : readTuningEvidence(proposal);
  }, [correlationId, data]);
};
