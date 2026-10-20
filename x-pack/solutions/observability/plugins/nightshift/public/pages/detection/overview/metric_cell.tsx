/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPanelProps, IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export type MetricTone = Extract<EuiPanelProps['color'], 'subdued' | 'warning' | 'danger'>;

export interface MetricCellProps {
  icon: IconType;
  tone: MetricTone;
  value: number | undefined;
  getLabel: (count: number) => string;
  tooltip: string;
  isLoading: boolean;
  testSubject: string;
}

export const MetricCell = ({
  icon,
  tone,
  value,
  getLabel,
  tooltip,
  isLoading,
  testSubject,
}: MetricCellProps): React.ReactElement => (
  <EuiToolTip content={tooltip} position="bottom">
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      responsive={false}
      data-test-subj={testSubject}
      tabIndex={0}
    >
      <EuiFlexItem grow={false}>
        <EuiPanel color={tone} paddingSize="s" hasBorder={false} hasShadow={false} grow={false}>
          <EuiIcon type={icon} size="l" aria-hidden={true} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <div>
            {isLoading ? (
              <EuiSkeletonRectangle width={40} height={20} borderRadius="s" />
            ) : (
              value?.toLocaleString(i18n.getLocale())
            )}
          </div>
        </EuiTitle>
        <EuiText size="s">
          <span>{getLabel(value ?? 0)}</span>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiToolTip>
);
