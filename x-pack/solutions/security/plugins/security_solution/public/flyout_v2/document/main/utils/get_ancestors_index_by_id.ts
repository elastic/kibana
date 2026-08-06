/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import {
  EVENT_SOURCE_FIELD_NAME,
  LEGACY_EVENT_SOURCE_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { ANCESTOR_INDEX, LEGACY_ANCESTOR_INDEX } from '../constants/field_names';

// The ancestor id/index arrays are parallel, and both the current (`kibana.alert.ancestors.*`) and
// legacy (`signal.ancestors.*`) field names may be present depending on the alert's schema version.
const ANCESTOR_ID_INDEX_FIELD_PAIRS: ReadonlyArray<readonly [idField: string, indexField: string]> =
  [
    [EVENT_SOURCE_FIELD_NAME, ANCESTOR_INDEX],
    [LEGACY_EVENT_SOURCE_FIELD_NAME, LEGACY_ANCESTOR_INDEX],
  ];

/**
 * Builds a map from each ancestor document id (`kibana.alert.ancestors.id`, or the legacy
 * `signal.ancestors.id`) to the index that document lives in (`kibana.alert.ancestors.index` /
 * `signal.ancestors.index`), by aligning the two parallel arrays by position. This lets the Table
 * tab turn each "Source event" value into a link that opens the correct ancestor document, even for
 * alert-on-alert cases where several ancestors (at different depths) are listed in the same field.
 *
 * Threshold rules are intentionally excluded: they synthesize a fake ancestor id to represent the
 * aggregation bucket, and that id does not correspond to a real document — clicking it would return
 * a 500 from the server (see https://github.com/elastic/kibana/issues/238019). Returning an empty
 * map for those keeps the values rendered as plain text.
 */
export const getAncestorsIndexById = (
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[]
): Record<string, string> => {
  const ruleType = dataFormattedForFieldBrowser.find((item) => item.field === ALERT_RULE_TYPE)
    ?.values?.[0];

  if (ruleType === 'threshold') {
    return {};
  }

  return ANCESTOR_ID_INDEX_FIELD_PAIRS.reduce<Record<string, string>>(
    (acc, [idField, indexField]) => {
      const ids = dataFormattedForFieldBrowser.find((item) => item.field === idField)?.values ?? [];
      const indices =
        dataFormattedForFieldBrowser.find((item) => item.field === indexField)?.values ?? [];

      ids.forEach((id, i) => {
        const indexName = indices[i];
        if (id && indexName) {
          acc[id] = indexName;
        }
      });
      return acc;
    },
    {}
  );
};
