/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiStat, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';

interface Props {
  title?: string | number;
  description: string;
  titleColor: string;
  isLoading: boolean;
  tooltip?: string;
  onClick?: () => void;
  subtitle?: string;
  subtitleTooltip?: string;
  onSubtitleClick?: () => void;
}

export function OverviewItem({
  title,
  description,
  titleColor,
  isLoading,
  tooltip,
  onClick,
  subtitle,
  subtitleTooltip,
  onSubtitleClick,
}: Props) {
  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={tooltip}>
        <EuiStat
          title={title}
          description={description}
          titleColor={titleColor}
          isLoading={isLoading}
          onClick={() => onClick?.()}
          css={{ cursor: 'pointer' }}
        />
      </EuiToolTip>
      <EuiToolTip content={subtitleTooltip}>
        <EuiText
          tabIndex={-1}
          size="xs"
          color="subdued"
          onClick={() => onSubtitleClick?.()}
          css={{ cursor: 'pointer' }}
        >
          {subtitle}
        </EuiText>
      </EuiToolTip>
    </EuiFlexItem>
  );
}
