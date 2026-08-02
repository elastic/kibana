/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** As much of an Attack Discovery 2.0 alert as the blast radius is derived from. */
export interface DiscoveryAlertIdsSource {
  /**
   * Ids of the constituent detection alerts. The only structured entity source there is: AD 2.0
   * carries `entity_summary_markdown` prose and no `entities[]` field at all (G2).
   */
  alert_ids: string[];
  id: string;
}

export interface BuildDiscoveryAlertIdsParams {
  /** Discoveries as `findAttackDiscoveryAlerts` returned them, in any order. */
  alerts: readonly DiscoveryAlertIdsSource[];
  /**
   * Ids `resolveReadableAttackDiscoveryAlertIds` confirmed the caller can read (S3). Applied here
   * as well as at the source, so a widened read upstream cannot silently reach the alerts index.
   */
  readableAttackDiscoveryAlertIds: ReadonlySet<string>;
}

/**
 * The `correlationId → constituent alert ids` map the single `filters` aggregation is
 * keyed on.
 *
 * A discovery with no constituent alerts is dropped rather than carried through as an empty
 * filter: it can produce neither an entity nor a score, and the contract represents that as no
 * entry, never as an entry claiming an empty blast radius. An uncorrelated run therefore costs
 * nothing here and never reaches the badge as a zero.
 */
export const buildDiscoveryAlertIds = ({
  alerts,
  readableAttackDiscoveryAlertIds,
}: BuildDiscoveryAlertIdsParams): Record<string, string[]> =>
  alerts.reduce<Record<string, string[]>>((acc, { alert_ids: alertIds, id }) => {
    if (!readableAttackDiscoveryAlertIds.has(id) || alertIds.length === 0) {
      return acc;
    }

    return { ...acc, [id]: Array.from(new Set(alertIds)) };
  }, {});
