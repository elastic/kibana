/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonRectangle,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export type MetricTone = 'neutral' | 'warning' | 'danger';

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
}: MetricCellProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const toneStyles = {
    neutral: { background: euiTheme.colors.backgroundLightNeutral, icon: 'text' },
    warning: { background: euiTheme.colors.backgroundLightWarning, icon: 'warning' },
    danger: { background: euiTheme.colors.backgroundLightDanger, icon: 'danger' },
  }[tone];

  return (
    <EuiToolTip content={tooltip} position="bottom">
      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
        responsive={false}
        data-test-subj={testSubject}
        tabIndex={0}
      >
        <EuiFlexItem grow={false}>
          <div
            css={css`
              display: flex;
              padding: ${euiTheme.size.s};
              border-radius: ${euiTheme.border.radius.medium};
              background: ${toneStyles.background};
            `}
          >
            <EuiIcon type={icon} size="m" color={toneStyles.icon} aria-hidden={true} />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <div>
              {isLoading ? (
                <EuiSkeletonRectangle width={40} height={16} borderRadius="s" />
              ) : (
                value?.toLocaleString(i18n.getLocale())
              )}
            </div>
          </EuiTitle>
          <EuiText size="xs">
            <span>{getLabel(value ?? 0)}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
