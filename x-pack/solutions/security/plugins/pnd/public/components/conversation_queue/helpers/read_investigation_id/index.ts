/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGateDefinitionByGateId } from '@kbn/pnd-common';
import type { PndProposalRow } from '@kbn/pnd-common';

/**
 * The investigation a pending gate belongs to, or `undefined` when it does not belong to one **yet**.
 *
 * The identity of an investigation is the **Attack Discovery alert id**, not a second id of its own.
 * Every derived container hangs off that one key (epic decision 3 / ADR-003): the Investigation,
 * Incident and Tuning conversations are all `uuidv5(correlationId, <namespace>)`, one per
 * alert, so "the investigation" and "the discovery it was opened for" are the same subject addressed
 * two ways. The server side of this rule is
 * [`filterRowsByInvestigation`](../../../../../server/routes/investigations/helpers/filter_rows_by_investigation/index.ts),
 * which matches a row to an investigation through the same key and accepts either form of it; this is
 * the browser reading the key straight off the row instead of re-deriving a UUIDv5 to throw away.
 *
 * Two rows return `undefined`, and neither is an error state:
 *
 * 1. **The gate that opens the investigation.** `await_open_investigation` is the lane's *first* gate
 *    and it parks **before** the container it names exists — `watch_floor.yaml` runs `await_…` at step
 *    2.4 and `open_investigation` only after it resumes. So a proposal parked there has no
 *    investigation to sit under, which is the *normal* case rather than a repair job. The test is
 *    structural (`role: 'container'` + `parentKind: 'investigation'`) rather than a comparison against
 *    `PND_GATE_IDS.openInvestigation`, because the registry already encodes "which gates open which
 *    container" as fields and pins the container count at two; `open_investigation` is that pair's
 *    investigation half, and today its only member.
 * 2. **An uncorrelated run.** `correlationId` is `''` — never absent — when the proposals
 *    route could not correlate the gate's run to a discovery. There is no investigation identity to
 *    read, so the row belongs to no investigation, exactly as the server helper above fails closed on
 *    the same value.
 *
 * A gate the registry does not know also returns `undefined`, for the same fail-closed reason: this
 * cannot say a container exists for a gate it cannot place in the lane, and claiming membership is the
 * assertion that would be wrong. In production the case does not arise — `readPendingProposalRows`
 * only ever emits registered gates (D4) — so this bites fixtures rather than analysts.
 */
export const readInvestigationId = ({
  correlationId,
  gateId,
}: PndProposalRow): string | undefined => {
  if (correlationId.trim() === '') {
    return undefined;
  }

  const gate = getGateDefinitionByGateId(gateId);

  if (gate == null || (gate.role === 'container' && gate.parentKind === 'investigation')) {
    return undefined;
  }

  return correlationId;
};
