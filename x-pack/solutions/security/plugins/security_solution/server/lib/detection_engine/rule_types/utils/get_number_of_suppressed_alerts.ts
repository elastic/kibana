/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALERT_SUPPRESSION_DOCS_COUNT } from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';

import type { BaseFieldsLatest } from '../../../../../common/api/detection_engine/model/alerts';

export const getNumberOfSuppressedAlerts = <
  T extends SuppressionFieldsLatest & BaseFieldsLatest & { _id: string }
>(
  createdAlerts: T[],
  suppressedAlerts: T[]
): number => {
  return (
    createdAlerts.reduce((acc, alert) => acc + (alert?.[ALERT_SUPPRESSION_DOCS_COUNT] || 0), 0) +
    suppressedAlerts.reduce(
      (acc, alert) => acc + (alert?.[ALERT_SUPPRESSION_DOCS_COUNT] || 0) + 1,
      0
    )
  );
};
