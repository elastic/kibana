/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { RiskScore } from './risk_score';
import { AlertHeaderBlock } from './alert_header_block';
import { RISK_SCORE_TITLE_TEST_ID } from './test_ids';
import { EventKind } from '../constants/event_kinds';

export interface HeaderActionsProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

/**
 * Alert summary blocks (risk score, status, assignees, notes) displayed below the header title.
 * Only renders for alerts.
 */
export const HeaderActions = memo(({ hit }: HeaderActionsProps) => {
  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );

  if (!isAlert) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <AlertHeaderBlock
            hasBorder
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.header.riskScoreTitle"
                defaultMessage="Risk score"
              />
            }
            data-test-subj={RISK_SCORE_TITLE_TEST_ID}
          >
            <RiskScore hit={hit} />
          </AlertHeaderBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

HeaderActions.displayName = 'HeaderActions';
