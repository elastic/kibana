/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';
import { RISK_SCORE_VALUE_TEST_ID } from './test_ids';

export interface RiskScoreProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

/**
 * Document details risk score displayed in flyout header
 */
export const RiskScore = memo(({ hit }: RiskScoreProps) => {
  const riskScore = useMemo(() => {
    const value = getFieldValue(hit, ALERT_RISK_SCORE);

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string' && value.length > 0) {
      return value;
    }

    return null;
  }, [hit]);

  if (riskScore === null) {
    return null;
  }

  return <span data-test-subj={RISK_SCORE_VALUE_TEST_ID}>{riskScore}</span>;
});

RiskScore.displayName = 'RiskScore';
