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
  const riskScore = useMemo(() => {
    const rs = getFieldValue(hit, ALERT_RISK_SCORE);
    if (typeof rs === 'string' || typeof rs === 'number') {
      return rs;
    } else if (Array.isArray(rs) && rs.length > 0) {
      return rs[0];
    } else {
      return null;
    }
  }, [hit]);

  return <span data-test-subj={RISK_SCORE_VALUE_TEST_ID}>{riskScore}</span>;
});

RiskScore.displayName = 'RiskScore';
