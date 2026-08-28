/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * Matches a leading `_id,<value>` field, mirroring the CSV alert shape produced
 * by the default retrieval path (`getCsvFromData`), where each anonymized alert
 * begins with an `_id,<id>` line.
 */
const EMBEDDED_ID_PREFIX = /^\s*_id,/;

/**
 * Deterministically guarantees that each curated skill alert string embeds its
 * backing document `_id`, rather than trusting the skill prompt alone.
 *
 * The skill's `ai.agent` step returns both a curated `alerts` array (descriptive
 * strings) and a parallel `alert_ids` array. When the two are aligned (equal
 * length), this prepends the authoritative `_id,<id>` line to any alert that does
 * not already contain its backing id, matching the default retrieval CSV shape so
 * the downstream Attack Discovery pipeline can cite and verify real alert ids.
 *
 * When the arrays cannot be positionally mapped (different lengths, or no ids at
 * all), the alerts are returned unchanged and a warning is logged identifying how
 * many alerts lack an embedded `_id` (those discoveries risk being discarded as
 * hallucinations downstream).
 */
export const enforceEmbeddedAlertIds = ({
  alertIds,
  alerts,
  logger,
}: {
  alertIds: string[];
  alerts: string[];
  logger?: Logger;
}): string[] => {
  if (alertIds.length > 0 && alertIds.length === alerts.length) {
    return alerts.map((alert, index) => {
      const id = alertIds[index];

      return alert.includes(id) ? alert : `_id,${id}\n${alert}`;
    });
  }

  const missingCount = alerts.filter((alert) => !EMBEDDED_ID_PREFIX.test(alert)).length;

  if (missingCount > 0) {
    logger?.warn(
      `Skill alert retrieval returned ${missingCount} of ${alerts.length} alerts without an embedded _id and ${alertIds.length} alert_ids that could not be positionally mapped; these alerts risk being discarded as hallucinations downstream`
    );
  }

  return alerts;
};
