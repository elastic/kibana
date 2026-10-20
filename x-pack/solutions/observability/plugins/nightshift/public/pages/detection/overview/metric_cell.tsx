/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface MetricCellProps {
  icon: IconType;
  value: number | undefined;
  label: string;
  tooltip: string;
  isLoading: boolean;
  testSubject: string;
}

export const MetricCell = ({
  icon,
  value,
  label,
  tooltip,
  isLoading,
  testSubject,
}: MetricCellProps): React.ReactElement => (
  <EuiToolTip content={tooltip} position="bottom">
    <div data-test-subj={testSubject} tabIndex={0}>
      <EuiTitle size="s">
        <div>
          {isLoading ? (
            <EuiSkeletonText
              lines={1}
              css={css`
                width: 3rem;
              `}
            />
          ) : (
            value?.toLocaleString(i18n.getLocale())
          )}
        </div>
      </EuiTitle>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} color="subdued" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <span>{label}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  </EuiToolTip>
);
