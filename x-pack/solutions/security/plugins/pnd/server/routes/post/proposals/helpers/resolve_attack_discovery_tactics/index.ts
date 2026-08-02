/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import {
  PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS,
} from '@kbn/pnd-common';

import { findAttackDiscoveryAlerts } from '../../../../get/conversations/helpers/find_attack_discovery_alerts';

export interface ResolveAttackDiscoveryTacticsParams {
  /** The discovery the contained incident was raised from. */
  correlationId: string;
  /** Core's HTTP start contract, used to self-call `_find` as the caller (S3). */
  http: HttpServiceStart;
  /** The responding user's request; the discovery is resolved with their privileges, not ours. */
  request: KibanaRequest;
  /** Space resolved from the request (S9). */
  spaceId: string;
}

/**
 * Bound an Attack Discovery's `mitre_attack_tactics` to what the trigger schema accepts.
 *
 * `DetectionChangeSignalEventSchema` bounds `tactics` on three axes and is `.strict()`, so a
 * discovery carrying a duplicate, a blank, an over-long label, or more than
 * `PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS` entries would fail validation and cost the whole signal.
 * The labels come from an LLM-authored document, so none of those three is hypothetical. Clamping
 * here rather than upstream keeps the emit's success independent of how tidy the discovery is.
 */
const boundTactics = (tactics: string[]): string[] =>
  [
    ...new Set(
      tactics
        .filter((tactic) => typeof tactic === 'string' && tactic.trim() !== '')
        .map((tactic) =>
          tactic.trim().slice(0, PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH)
        )
    ),
  ].slice(0, PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS);

/**
 * The MITRE ATT&CK tactics a Detection Change Signal claims its coverage gap sits in.
 *
 * The tactics are read off the Attack Discovery document itself, resolved **as the calling user**
 * through {@link findAttackDiscoveryAlerts} (`GET /api/attack_discovery/_find?ids=`, security finding
 * S3) — there is no LLM anywhere in this path, and no internal-user read. A discovery the caller
 * cannot read resolves to `[]`, which is the same answer as a discovery that carries no tactics: AD
 * 2.0 types `mitre_attack_tactics` as optional, and `tactics` is permitted to be empty precisely so
 * that neither case has to be papered over with an invented tactic.
 */
export const resolveAttackDiscoveryTactics = async ({
  correlationId,
  http,
  request,
  spaceId,
}: ResolveAttackDiscoveryTacticsParams): Promise<string[]> => {
  const alerts = await findAttackDiscoveryAlerts({
    http,
    ids: [correlationId],
    request,
    spaceId,
  });

  return boundTactics(
    alerts.flatMap(({ mitre_attack_tactics: tactics }) => (Array.isArray(tactics) ? tactics : []))
  );
};
