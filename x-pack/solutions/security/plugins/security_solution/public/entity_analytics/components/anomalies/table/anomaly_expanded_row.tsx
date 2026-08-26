/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ENTITY_ANOMALY_TABLE_EXPANDED_ROW_COUNT,
  ENTITY_ANOMALY_TABLE_EXPANDED_ROW_DESCRIPTION,
  ENTITY_ANOMALY_TABLE_EXPANDED_ROW_KEY_FIELDS,
} from '../translations';
import { ANOMALIES_TABLE_EXPANDED_ROW_DESCRIPTION_TEST_ID } from '../test_ids';
import type { TableRow } from './types';

interface AnomalyExpandedRowProps {
  row: TableRow;
}

const ExpandedSection: React.FC<{
  heading: string;
  children: React.ReactNode;
  testSubj?: string;
}> = ({ heading, children, testSubj }) => (
  <div data-test-subj={testSubj}>
    <EuiText size="xs">
      <strong>{heading}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiText size="xs">{children}</EuiText>
  </div>
);

export const AnomalyExpandedRow: React.FC<AnomalyExpandedRowProps> = ({ row }) => (
  <div
    css={css`
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `}
  >
    <ExpandedSection
      heading={ENTITY_ANOMALY_TABLE_EXPANDED_ROW_DESCRIPTION}
      testSubj={ANOMALIES_TABLE_EXPANDED_ROW_DESCRIPTION_TEST_ID}
    >
      {row.description}
    </ExpandedSection>
    <ExpandedSection heading={ENTITY_ANOMALY_TABLE_EXPANDED_ROW_COUNT}>
      {row.anomalyCount.toLocaleString()}
    </ExpandedSection>
    {row.keyFields?.length > 0 && (
      <ExpandedSection heading={ENTITY_ANOMALY_TABLE_EXPANDED_ROW_KEY_FIELDS}>
        {row.keyFields.join('; ')}
      </ExpandedSection>
    )}
  </div>
);
