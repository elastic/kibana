/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiStat, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export type MetricTone = 'neutral' | 'warning' | 'danger';

export interface MetricCellProps {
  icon: IconType;
  tone: MetricTone;
  value: number | undefined;
  getLabel: (count: number) => string;
  isLoading: boolean;
  testSubject: string;
}

export const MetricCell = ({
  icon,
  tone,
  value,
  getLabel,
  isLoading,
  testSubject,
}: MetricCellProps): React.ReactElement => {
  const { colors } = useEuiTheme().euiTheme;
  const label = getLabel(value ?? 0);
  const { background, iconColor } = {
    neutral: { background: colors.backgroundLightText, iconColor: colors.textSubdued },
    warning: { background: colors.backgroundLightWarning, iconColor: colors.textWarning },
    danger: { background: colors.backgroundLightDanger, iconColor: colors.textDanger },
  }[tone];

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      responsive={false}
      data-test-subj={testSubject}
    >
      <EuiFlexItem grow={false}>
        <EuiAvatar
          type="space"
          size="l"
          name={label}
          iconType={icon}
          color={background}
          iconColor={iconColor}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          title={value?.toLocaleString(i18n.getLocale()) ?? ''}
          description={label}
          titleSize="xs"
          reverse
          isLoading={isLoading}
          descriptionElement="span"
          titleElement="span"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
