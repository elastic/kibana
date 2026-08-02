/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';

/**
 * What each investigation on the queue is **called**, keyed by the discovery id that identifies it.
 *
 * The name comes off the `[Investigation]` conversation rather than off the proposal rows, because that
 * is where it really lives: `watch_floor.yaml`'s `create_investigation_container` step titles the
 * conversation with the Attack Discovery's own title at mint time, so the queue and Agent Builder's
 * own conversation picker read one name (`kibana-phf4.16`). `PndProposalRow` carries no investigation title
 * and this deliberately does not invent one from a row's `threadTitle`: a proposal's title standing in
 * for its container's would be a quiet lie in the one place a group header has to be trustworthy.
 *
 * Two filters, both deliberate:
 *
 * - **`kind === 'investigation'` only.** The list holds all four derived kinds, and an incident or a
 *   thread of the same discovery is a *different* conversation with a different title. `kind` is
 *   re-derived from the id namespace on every read (register `#21`), so it cannot have drifted.
 * - **A blank title is dropped rather than kept.** `_rename` accepts any string including `''`, and an
 *   empty heading is worse than the honest fallback the caller supplies. This is the same
 *   absent-never-blank rule the rest of the contract follows.
 */
export const readInvestigationTitles = (
  conversations: readonly PndConversation[]
): ReadonlyMap<string, string> =>
  new Map(
    conversations
      .filter(({ kind, title }) => kind === 'investigation' && title.trim() !== '')
      .map(({ correlationId, title }) => [correlationId, title])
  );
