/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RISK_SCORE, EVENT_KIND } from '@kbn/rule-data-utils';
import { RISK_SCORE_VALUE_TEST_ID } from '../../shared/components/test_ids';

export interface RiskScoreProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

/**
 * Document details risk score displayed in flyout right section header
 */
export const RiskScore = memo(({ hit }: RiskScoreProps) => {
  const isAlert = useMemo(() => (getFieldValue(hit, EVENT_KIND) as string) === 'signal', [hit]);
  const fieldsData = useMemo(() => getFieldValue(hit, ALERT_RISK_SCORE), [hit]);

  if (!isAlert || fieldsData == null) {
    return null;
  }

  let alertRiskScore: string | number;
  if (typeof fieldsData === 'string' || typeof fieldsData === 'number') {
    alertRiskScore = fieldsData;
  } else if (Array.isArray(fieldsData) && fieldsData.length > 0) {
    alertRiskScore = fieldsData[0];
  } else {
    return null;
  }

  return <span data-test-subj={RISK_SCORE_VALUE_TEST_ID}>{String(alertRiskScore)}</span>;
});

RiskScore.displayName = 'RiskScore';
