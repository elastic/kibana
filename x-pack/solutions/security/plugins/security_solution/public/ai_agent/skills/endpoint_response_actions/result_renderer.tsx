/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import type { ActionResult } from './types';

interface ResultCardProps {
  result: ActionResult;
}

type BadgeColor = 'default' | 'success' | 'danger';

const STATUS_CONFIG: Record<
  ActionResult['status'],
  { color: BadgeColor; label: string; iconType: string }
> = {
  pending: {
    color: 'default',
    label: 'Pending',
    iconType: 'clock',
  },
  completed: {
    color: 'success',
    label: 'Completed',
    iconType: 'checkInCircleFilled',
  },
  failed: {
    color: 'danger',
    label: 'Failed',
    iconType: 'errorFilled',
  },
};

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const { color, label, iconType } = STATUS_CONFIG[result.status];

  return (
    <EuiPanel
      paddingSize="s"
      hasBorder
      data-test-subj={`endpoint-response-action-result-${result.status}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color={color} iconType={iconType}>
            {label}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            Action ID: {result.actionId} &middot; {result.timestamp}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {result.errorMessage && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="danger">
            {result.errorMessage}
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};
