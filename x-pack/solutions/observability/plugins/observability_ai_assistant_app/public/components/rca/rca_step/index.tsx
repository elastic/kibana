/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPanel } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { RootCauseAnalysisPanel } from '../rca_panel';

export interface RootCauseAnalysisStepItemProps {
  label: React.ReactNode;
  loading?: boolean;
  color?: React.ComponentProps<typeof EuiPanel>['color'];
  button?: React.ReactElement;
  iconType?: React.ComponentProps<typeof EuiIcon>['type'];
}

export function RootCauseAnalysisStepItem({
  label,
  loading,
  color,
  iconType,
  button,
}: RootCauseAnalysisStepItemProps) {
  return (
    <RootCauseAnalysisPanel color={color}>
      <EuiFlexGroup
        direction="row"
        alignItems="flexStart"
        justifyContent="flexStart"
        gutterSize="m"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            className={css`
              min-height: 40px;
            `}
            justifyContent="center"
            alignItems="center"
          >
            {loading ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <EuiIcon type={iconType || 'logoElastic'} />
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            direction="row"
            alignItems="center"
            className={css`
              min-height: 40px;
            `}
          >
            <EuiText size="s">{label}</EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        {button ? <EuiFlexItem grow={false}>{button}</EuiFlexItem> : null}
      </EuiFlexGroup>
    </RootCauseAnalysisPanel>
  );
}
