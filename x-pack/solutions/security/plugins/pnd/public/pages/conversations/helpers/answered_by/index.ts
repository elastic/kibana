/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_AUTO_RESPOND_RATIONALE_PREFIX } from '@kbn/pnd-common';
import type { PndAutoRespondOrigin } from '@kbn/pnd-common';
import * as i18n from '../../translations';

/**
 * What the record can honestly say answered a gate.
 *
 * Four values rather than a human/automated pair: `unrecorded` is a real, distinct
 * state — an external resume can settle a gate without stamping a principal — and
 * collapsing it into either of the other two is exactly the misattribution D12
 * exists to prevent. `autonomy_auto` and `autonomy_dial` are the two `_auto_respond`
 * origins.
 */
export type PndAnsweredBySource = 'autonomy_auto' | 'autonomy_dial' | 'responder' | 'unrecorded';

export interface PndAnsweredBy {
  /** Ready to render; the caller adds no copy of its own. */
  label: string;
  source: PndAnsweredBySource;
}

export interface DeriveAnsweredByArgs {
  /** The rationale recorded on the answer, absent on a gate answered without one. */
  rationale?: string;
  /** The username the resume stamped, absent when nothing stamped one. */
  respondedBy?: string;
}

const originFromRationale = (rationale: string): PndAutoRespondOrigin =>
  rationale.endsWith(' (dial)') ? 'dial' : 'auto';

const autoRespondAttribution = ({
  origin,
  respondedBy,
}: {
  origin: PndAutoRespondOrigin;
  respondedBy?: string;
}): PndAnsweredBy => {
  const actor = respondedBy?.trim();
  const source = origin === 'dial' ? 'autonomy_dial' : 'autonomy_auto';

  if (actor != null && actor.length > 0) {
    return {
      label:
        origin === 'dial'
          ? i18n.answeredByAutonomyDialRunBy(actor)
          : i18n.answeredByAutonomyAutoRunBy(actor),
      source,
    };
  }

  return {
    label: origin === 'dial' ? i18n.ANSWERED_BY_AUTONOMY_DIAL : i18n.ANSWERED_BY_AUTONOMY_AUTO,
    source,
  };
};

/**
 * Who answered a gate, derived from the two fields the answered row actually carries (D12).
 *
 * **The rationale is read before `respondedBy`, and the order is the whole point.**
 * `_auto_respond` resumes a gate through the very same `resumeWorkflowExecution` call a
 * person's approval uses, and its audit stamp names the acting user — so an
 * auto-responded row and an approval are byte-for-byte identical apart from
 * {@link PND_AUTO_RESPOND_RATIONALE_PREFIX}. Reading `respondedBy` first would render
 * every auto-responded gate as somebody's decision, which is the single most
 * misleading thing this surface could do.
 *
 * The prefix is imported rather than retyped because `_auto_respond` is the writer:
 * the two sides of one literal drifting apart would silently re-label every
 * auto-responded gate as a person's approval, with no failing test anywhere. The
 * match is anchored at the start of the string, so a rationale that merely *quotes*
 * the sentence is still the responder's. The `(auto)` / `(dial)` suffix selects the
 * variant.
 *
 * ⚠️ One limit this cannot escape, which is why the thin slice ships this rather than a
 * "Human vs Automated" legend:
 * - Nothing stops a person from typing the auto-respond sentence as their own rationale.
 *   The prefix is a convention between two pieces of PND, not an authenticated claim.
 *   Every gate now parks, so an answered gate always has a `waitForInput` document —
 *   the prefix is the only attribution signal.
 * - Changing the prefix orphans attribution on already-answered gates. That is accepted.
 */
export const deriveAnsweredBy = ({
  rationale,
  respondedBy,
}: DeriveAnsweredByArgs): PndAnsweredBy => {
  if (rationale?.startsWith(PND_AUTO_RESPOND_RATIONALE_PREFIX) === true) {
    return autoRespondAttribution({
      origin: originFromRationale(rationale),
      respondedBy,
    });
  }

  // a blank actor is treated as none at all, so an empty string can never render as accountable
  return respondedBy != null && respondedBy.trim().length > 0
    ? { label: i18n.answeredBy(respondedBy), source: 'responder' }
    : { label: i18n.ANSWERED_BY_UNRECORDED, source: 'unrecorded' };
};
