/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { TRIAGE_STRICT_KEY_TAG_PREFIX, TRIAGE_WIDE_KEY_TAG_PREFIX } from './constants';
import { buildPatternKeys } from './pattern_key';

/** The hash is a tag value, so it is kept short. 64 bits leave no realistic collision within a space. */
const HASH_LENGTH = 16;

/** Covers the space, which the alert document does not name, and the key (rule, revision, detection, condition). */
const hashKey = (spaceId: string, key: string): string =>
  createHash('sha256')
    .update(JSON.stringify([spaceId, key]))
    .digest('hex')
    .slice(0, HASH_LENGTH);

export interface KeyTagGroup {
  alertIds: string[];
  tags: string[];
}

export interface KeyCounts {
  alertsWithStrictKey: number;
  strictKeys: number;
  strictKeysSingleAlert: number;
  wideKeys: number;
  wideKeysSingleAlert: number;
  /** Confident false positives with no strict key: they group by rule and detection only. */
  fpCandidatesOnFallback: number;
}

export interface KeyTagPlan {
  /** Alerts that share both keys share one tag update, so a batch costs a call per distinct key pair. */
  groups: KeyTagGroup[];
  counts: KeyCounts;
}

const countKeys = (alertsByKey: ReadonlyMap<string, readonly string[]>) => ({
  keys: alertsByKey.size,
  single: [...alertsByKey.values()].filter((ids) => ids.length === 1).length,
});

const add = (map: Map<string, string[]>, key: string, id: string) =>
  map.set(key, [...(map.get(key) ?? []), id]);

/** Computes each alert's pattern keys, the tags that record them, and the batch's key statistics. */
export const planKeyTags = ({
  alerts,
  fpCandidateIds,
  spaceId,
}: {
  alerts: ReadonlyArray<{ id: string; doc: Record<string, unknown> }>;
  fpCandidateIds: readonly string[];
  spaceId: string;
}): KeyTagPlan => {
  const strictAlerts = new Map<string, string[]>();
  const wideAlerts = new Map<string, string[]>();
  const groups = new Map<string, KeyTagGroup>();
  const withoutStrict = new Set<string>();

  for (const { id, doc } of alerts) {
    const { strict, wide } = buildPatternKeys(doc);
    const wideHash = hashKey(spaceId, wide);
    add(wideAlerts, wideHash, id);
    const tags = [`${TRIAGE_WIDE_KEY_TAG_PREFIX}${wideHash}`];
    if (strict === undefined) {
      withoutStrict.add(id);
    } else {
      const strictHash = hashKey(spaceId, strict);
      add(strictAlerts, strictHash, id);
      tags.unshift(`${TRIAGE_STRICT_KEY_TAG_PREFIX}${strictHash}`);
    }
    const groupKey = tags.join('\n');
    groups.set(groupKey, { alertIds: [...(groups.get(groupKey)?.alertIds ?? []), id], tags });
  }

  const strict = countKeys(strictAlerts);
  const wide = countKeys(wideAlerts);
  return {
    groups: [...groups.values()],
    counts: {
      alertsWithStrictKey: [...strictAlerts.values()].reduce((sum, ids) => sum + ids.length, 0),
      strictKeys: strict.keys,
      strictKeysSingleAlert: strict.single,
      wideKeys: wide.keys,
      wideKeysSingleAlert: wide.single,
      fpCandidatesOnFallback: fpCandidateIds.filter((id) => withoutStrict.has(id)).length,
    },
  };
};
