/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype loading skeleton for BA-v.3 anomaly tables (left Anomalies table
 * and right-panel Recent anomalies table).
 *
 * Cleanup: delete with the State selector / loading-state wiring.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { BEHAVIORAL_ANOMALIES_V3_TABLE_LOADING_SKELETON_TEST_ID } from '../test_ids';

interface AnomaliesTableLoadingSkeletonV3Props {
  lines?: number;
  size?: 's' | 'm' | 'l';
  'data-test-subj'?: string;
}

export const AnomaliesTableLoadingSkeletonV3: React.FC<AnomaliesTableLoadingSkeletonV3Props> = ({
  lines = 4,
  size = 'm',
  'data-test-subj': dataTestSubj = BEHAVIORAL_ANOMALIES_V3_TABLE_LOADING_SKELETON_TEST_ID,
}) => (
  <div data-test-subj={dataTestSubj}>
    <EuiSkeletonText lines={lines} size={size} />
  </div>
);
