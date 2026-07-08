/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype-only empty row message for BA-v.3 tables (left Anomalies table and
 * right-panel Recent anomalies table).
 *
 * Cleanup: delete with the State selector / empty-state wiring.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { ANOMALIES_TABLE_V3_EMPTY_MESSAGE } from '../translations';
import { BEHAVIORAL_ANOMALIES_V3_TABLE_EMPTY_MESSAGE_TEST_ID } from '../test_ids';

interface AnomaliesTableEmptyMessageV3Props {
  message?: string;
  testSubj?: string;
  className?: string;
}

export const AnomaliesTableEmptyMessageV3: React.FC<AnomaliesTableEmptyMessageV3Props> = ({
  message = ANOMALIES_TABLE_V3_EMPTY_MESSAGE,
  testSubj = BEHAVIORAL_ANOMALIES_V3_TABLE_EMPTY_MESSAGE_TEST_ID,
  className = 'behavioralAnomaliesV3TableEmptyMessage',
}) => (
  <EuiText size="xs" textAlign="center" className={className} data-test-subj={testSubj}>
    {message}
  </EuiText>
);
