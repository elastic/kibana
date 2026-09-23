/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertSuppression,
  AlertSuppressionCamel,
} from '../../../../../common/api/detection_engine/model/rule_schema';

type AlertSuppressionShape = AlertSuppression | AlertSuppressionCamel;

/**
 * Returns suppression "group by" field names, preferring `group_by_v2` / `groupByV2` when present
 * (see https://github.com/elastic/kibana/issues/193110).
 */
export const getEffectiveSuppressionGroupByFields = (
  alertSuppression: AlertSuppressionShape | undefined
): string[] => {
  if (alertSuppression == null) {
    return [];
  }

  const v2Entries =
    'groupByV2' in alertSuppression
      ? alertSuppression.groupByV2
      : 'group_by_v2' in alertSuppression
      ? alertSuppression.group_by_v2
      : undefined;

  if (v2Entries != null && v2Entries.length > 0) {
    return v2Entries.map(({ field }) => field);
  }

  const legacy =
    'groupBy' in alertSuppression && alertSuppression.groupBy != null
      ? alertSuppression.groupBy
      : 'group_by' in alertSuppression
      ? alertSuppression.group_by
      : undefined;

  return legacy ?? [];
};
