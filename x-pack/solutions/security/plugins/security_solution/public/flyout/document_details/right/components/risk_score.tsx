/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';
import type { GetFieldsData } from '../../shared/hooks/use_get_fields_data';
import { RISK_SCORE_VALUE_TEST_ID } from './test_ids';

export interface RiskScoreProps {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
}

/**
 * Document details risk score displayed in flyout right section header
 */
export const RiskScore = memo(({ getFieldsData }: RiskScoreProps) => {
  const fieldsData = getFieldsData(ALERT_RISK_SCORE);

  if (!fieldsData) {
    return null;
  }

  let alertRiskScore: string;
  if (typeof fieldsData === 'string') {
    alertRiskScore = fieldsData;
  } else if (Array.isArray(fieldsData) && fieldsData.length > 0) {
    alertRiskScore = fieldsData[0];
  } else {
    return null;
  }

  return <span data-test-subj={RISK_SCORE_VALUE_TEST_ID}>{alertRiskScore}</span>;
});

RiskScore.displayName = 'RiskScore';
