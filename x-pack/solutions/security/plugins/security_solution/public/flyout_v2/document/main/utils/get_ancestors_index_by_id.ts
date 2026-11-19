/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { getNonLocalQualifiedIndex } from '../../../shared/utils/non_local_index';
import { ANCESTORS, LEGACY_ANCESTORS } from '../constants/field_names';

interface Ancestor {
  id?: string;
  index?: string;
}

const toAncestors = (value: unknown): Ancestor[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is Ancestor => entry != null && typeof entry === 'object')
    : [];

/**
 * Builds a map from each ancestor document id (`kibana.alert.ancestors.id`, or the legacy
 * `signal.ancestors.id`) to the index that document lives in. This lets the Table tab and the
 * Highlighted Fields "Source event" link turn each value into a link that opens the correct ancestor
 * document, even for alert-on-alert cases where several ancestors (at different depths) are listed.
 *
 * The map is built from the nested `kibana.alert.ancestors` / `signal.ancestors` objects in
 * `_source`, where each entry keeps its own `{ id, index }` together. We intentionally do NOT align
 * the flattened `.id`/`.index` arrays by position: an EQL sequence produces an alert whose ancestors
 * interleave depth-0 events (real index) with depth-1 `signal` legs (empty index), and the empty
 * index values get dropped during field formatting — so the two arrays fall out of alignment and a
 * source event gets paired with the wrong index. See SDH #1666 / #1798, kibana #288207.
 *
 * Threshold rules are intentionally excluded: they synthesize a fake ancestor id to represent the
 * aggregation bucket, and that id does not correspond to a real document — clicking it would return
 * a 500 from the server (see https://github.com/elastic/kibana/issues/238019). Returning an empty
 * map for those keeps the values rendered as plain text.
 */
export const getAncestorsIndexById = (
  hit: DataTableRecord,
  documentIndex: string
): Record<string, string> => {
  const ruleType = getFieldValue(hit, ALERT_RULE_TYPE);
  if (ruleType === 'threshold') {
    return {};
  }

  const source = (hit.raw._source ?? {}) as Record<string, unknown>;
  const ancestors = [...toAncestors(source[ANCESTORS]), ...toAncestors(source[LEGACY_ANCESTORS])];

  return ancestors.reduce<Record<string, string>>((acc, { id, index }) => {
    if (id && index) {
      acc[id] = getNonLocalQualifiedIndex(index, documentIndex);
    }
    return acc;
  }, {});
};
