/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_SUPPRESSION_DOCS_COUNT } from '@kbn/rule-data-utils';
import type { GetFieldsData } from './use_get_fields_data';

export interface ShowSuppressedAlertsParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
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
  getFieldsData,
}: ShowSuppressedAlertsParams): ShowSuppressedAlertsResult => {
  const alertSuppressionField = getFieldsData(ALERT_SUPPRESSION_DOCS_COUNT);
  const alertSuppressionCount = alertSuppressionField ? parseInt(alertSuppressionField[0], 10) : 0;

  return {
    show: Boolean(alertSuppressionField),
    alertSuppressionCount,
  };
};
