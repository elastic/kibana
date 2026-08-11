/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { ALERT_SUPPRESSION_DOCS_COUNT } from '@kbn/rule-data-utils';

export interface ShowSuppressedAlertsParams {
  /**
   * The alert or event document
   */
  hit: DataTableRecord;
}

export interface ShowSuppressedAlertsResult {
  /**
   * Returns true if the document has kibana.alert.original_event.id field with values
   */
  show: boolean;
  /**
   * Number of suppressed alerts
   */
  alertSuppressionCount: number;
}

/**
 * Returns true if document has kibana.alert.suppression.docs_count field with values
 */
export const useShowSuppressedAlerts = ({
  hit,
}: ShowSuppressedAlertsParams): ShowSuppressedAlertsResult => {
  const alertSuppressionField = getFieldValue(hit, ALERT_SUPPRESSION_DOCS_COUNT);
  const alertSuppressionCount = alertSuppressionField
    ? parseInt(String(alertSuppressionField), 10)
    : 0;

  return useMemo(
    () => ({
      show: Boolean(alertSuppressionField),
      alertSuppressionCount,
    }),
    [alertSuppressionCount, alertSuppressionField]
  );
};
