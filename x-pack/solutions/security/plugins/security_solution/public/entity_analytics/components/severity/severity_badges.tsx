/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiNotificationBadge, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { SEVERITY_UI_SORT_ORDER } from '../../common/utils';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreLevel } from './common';
import type { SeverityCount } from './types';

export const SeverityBadges: React.FC<{
  severityCount: SeverityCount;
}> = React.memo(({ severityCount }) => {
  return (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      gutterSize="m"
      data-test-subj="risk-score-severity-badges"
    >
      <EuiFlexItem grow={false} />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m">
          {SEVERITY_UI_SORT_ORDER.map((status) => (
            <EuiFlexItem key={status} grow={false}>
              <SeverityBadge status={status} count={severityCount[status] || 0} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

SeverityBadges.displayName = 'SeverityBadges';

const SeverityBadge: React.FC<{ status: RiskSeverity; count: number }> = React.memo(
  ({ status, count }) => (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <RiskScoreLevel severity={status} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiNotificationBadge size="s" color="subdued">
          {count}
        </EuiNotificationBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

SeverityBadge.displayName = 'SeverityBadge';
