/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { KiProposal } from '../../../common';
import { DAY_MS } from '../../../common';
import type { IRecordsStore } from '../storage/records_store';

/** A KI must have been counted this long before the engine judges how it matches. */
const MIN_MINUTES = 6 * 60;
/** Matching in this share of minutes or more, a KI describes normal behaviour. */
const ALWAYS_MATCHES_SHARE = 0.9;

/**
 * The rule-quality report: KIs that match nearly every minute or never, read from the heartbeat
 * every KI records each minute it is counted. Code can compute this, so no AI is involved, and
 * the result is only ever a proposal: the KIs belong to the customer.
 */
export async function proposeKiChanges({
  records,
  links,
  now = Date.now(),
}: {
  records: IRecordsStore;
  links: QueryLink[];
  now?: number;
}): Promise<KiProposal[]> {
  const coverage = await records.seriesCoverage({
    fingerprintPrefix: 'ki_watch:',
    since: new Date(now - DAY_MS).toISOString(),
  });
  const byId = new Map(links.map((link) => [link.query.id, link]));
  return coverage.flatMap((series): KiProposal[] => {
    // `ki_watch:<source>:<ki>`
    const [, sourceId, kiId] = series.fingerprint.split(':');
    const link = byId.get(kiId);
    if (!link || series.minutes < MIN_MINUTES) {
      return [];
    }
    const share = series.nonZero / series.minutes;
    const base = {
      ki_id: kiId,
      source_id: sourceId,
      title: link.query.title,
      minutes: series.minutes,
      matched_minutes: series.nonZero,
    };
    if (share >= ALWAYS_MATCHES_SHARE) {
      return [
        {
          ...base,
          kind: 'always_matches',
          proposal: `Matched in ${Math.round(share * 100)}% of ${
            series.minutes
          } minutes: it describes normal behaviour. Narrow its query to the failing case, or exclude it; while it matches all the time its events stay open.`,
        },
      ];
    }
    if (series.nonZero === 0) {
      return [
        {
          ...base,
          kind: 'never_matches',
          proposal: `Never matched in ${series.minutes} minutes. Check it still fits the data, or exclude it.`,
        },
      ];
    }
    return [];
  });
}
