/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntIncompleteReason } from '@kbn/alertzero-common';
import type { PackageReportCoverageGap } from '../../../../../common/step_types/package_report';
import { MAX_HUNT_TECHNIQUE_IDS } from '../common/hunt_technique_limit';
import { truncateAtWord } from './coverage_text';

const MAX_GAP_DETAIL_CHARS = 200;
const MAX_GAP_TECHNIQUE_CHARS = 64;

/** Plain-English name for every reason a hunt can report a gap for. */
export const GAP_REASON_PHRASES: Record<HuntIncompleteReason, string> = {
  search_partial: 'search partially failed',
  index_unavailable: 'index unavailable',
  generation_failed: 'query generation failed',
  execute_failed: 'query execution failed',
  generation_budget: 'generation budget exhausted',
  collapsed: 'collapsed',
  query_out_of_scope: 'query out of scope',
  query_ungrounded: 'query not grounded in the report',
  quote_ungrounded: 'quote not grounded in the report',
  unknown_technique_id: 'unknown technique id',
  catalog_unavailable: 'ATT&CK catalog unavailable',
  rows_unclassifiable: 'rows could not be classified',
  refs_unavailable: 'references unavailable',
  nothing_searched: 'nothing searchable',
  input_truncated: 'input truncated',
  extraction_pending: 'extraction pending',
};

const isKnownReason = (reason: string): reason is HuntIncompleteReason =>
  Object.hasOwn(GAP_REASON_PHRASES, reason);

const reasonPhrase = (reason: string): string =>
  isKnownReason(reason) ? GAP_REASON_PHRASES[reason] : reason.replace(/_/g, ' ');

export interface DedupedCoverageGaps {
  gaps: PackageReportCoverageGap[];
  /** True when the input arrived at the cap, so more gaps than these may exist. */
  atLeast: boolean;
}

/**
 * Dedupes on reason, detail and technique (the narrative does the same), keeping order, and cuts
 * the two free-text fields: `detail` and `technique_id` are unbounded upstream, so the bound lives
 * here at render time rather than as a step input cap that would fail a long value.
 */
export const dedupeCoverageGaps = (
  gaps: readonly PackageReportCoverageGap[] | undefined
): DedupedCoverageGaps => {
  const input = gaps ?? [];
  const seen = new Set<string>();
  const deduped: PackageReportCoverageGap[] = [];
  for (const gap of input) {
    const key = `${gap.reason}|${gap.detail}|${gap.technique_id ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const detail = truncateAtWord(gap.detail, MAX_GAP_DETAIL_CHARS);
    const techniqueId =
      gap.technique_id === undefined
        ? undefined
        : truncateAtWord(gap.technique_id, MAX_GAP_TECHNIQUE_CHARS);
    deduped.push({
      reason: gap.reason,
      detail,
      ...(techniqueId ? { technique_id: techniqueId } : {}),
    });
  }
  return { gaps: deduped, atLeast: input.length >= MAX_HUNT_TECHNIQUE_IDS };
};

/** `3 gaps`, `1 gap`, or `at least 100 gaps`. Counts gaps, not techniques. */
export const gapCountPhrase = ({ gaps, atLeast }: DedupedCoverageGaps): string =>
  `${atLeast ? 'at least ' : ''}${gaps.length} ${gaps.length === 1 ? 'gap' : 'gaps'}`;

/**
 * One gap as prose. `detail` is only worth showing for an unknown technique id, where it can be
 * the only thing that names what was missed; for every other reason the phrase says enough.
 */
export const describeGap = ({
  reason,
  detail,
  technique_id: techniqueId,
}: PackageReportCoverageGap) => {
  const phrase = reasonPhrase(reason);
  const subject = techniqueId ?? (reason === 'unknown_technique_id' ? detail : undefined);
  return subject ? `${subject} (${phrase})` : phrase;
};

/**
 * The gap list as one line of prose, or undefined when nothing was reported. Identical phrases
 * collapse (several techniques can each carry `input truncated`; the count says how many gaps
 * there were). With `maxChars` the list is cut at an item boundary and the rest counted, so a
 * long list never ends mid-phrase.
 */
export const describeGaps = (
  deduped: DedupedCoverageGaps,
  maxChars?: number
): string | undefined => {
  const items = [...new Set(deduped.gaps.map(describeGap))];
  if (items.length === 0) return undefined;
  if (maxChars === undefined) return items.join(', ');
  const kept: string[] = [];
  let used = 0;
  for (const item of items) {
    const note = ` (+${items.length - kept.length - 1} more)`;
    const isLast = kept.length === items.length - 1;
    const next = used + (kept.length > 0 ? 2 : 0) + item.length;
    if (next + (isLast ? 0 : note.length) > maxChars) break;
    kept.push(item);
    used = next;
  }
  if (kept.length === 0) {
    const note = items.length > 1 ? ` (+${items.length - 1} more)` : '';
    const first = truncateAtWord(items[0], Math.max(0, maxChars - note.length));
    return first ? `${first}${note}` : undefined;
  }
  const more = items.length - kept.length;
  return `${kept.join(', ')}${more > 0 ? ` (+${more} more)` : ''}`;
};
