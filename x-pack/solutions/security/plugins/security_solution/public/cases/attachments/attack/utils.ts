/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';

/**
 * Maps the index snapshotted on the attachment to a pattern the attack flyout can actually read.
 *
 * `metadata.index` is the attack document's `_index` — the concrete backing index, e.g.
 * `.internal.alerts-security.attack.discovery.alerts-default-000001` — because that is what the
 * find API returns. Alert index privileges are granted on the alias
 * (`.alerts-security.attack.discovery.alerts*`), not on that backing index, so looking the
 * document up by its raw `_index` resolves nothing and the flyout renders its error state. Every
 * other caller that opens the attack flyout passes an index *pattern* for the same reason.
 *
 * Normalising here rather than at attach time is deliberate: attachment metadata is stored
 * unindexed and cannot be backfilled, so a write-time fix would leave already-attached attacks
 * permanently unopenable.
 *
 * Anything that matches neither attack-discovery index family is passed through unchanged — it is
 * already whatever the caller meant, and guessing would be worse than trying it.
 */
export const toReadableAttackIndexPattern = (index: string): string => {
  // Checked first: the adhoc index name contains the scheduled prefix as a substring.
  if (index.includes(ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX)) {
    return `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-*`;
  }
  if (index.includes(ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX)) {
    return `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-*`;
  }
  return index;
};
