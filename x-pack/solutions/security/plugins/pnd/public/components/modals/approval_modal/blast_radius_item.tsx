/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import type { IconColor, IconType } from '@elastic/eui';

export interface BlastRadiusItemProps {
  item: {
    id: string;
    iconType: IconType;
    /** Defaults to the modal tone's icon color */
    iconColor?: IconColor;
    /** Rich text — caller composes <strong>, <EuiCode>, <FormattedMessage>, etc. */
    text: React.ReactNode;
    status?: {
      label: string;
      iconType?: IconType;
      color?: 'success' | 'warning' | 'danger';
    };
  };
  defaultIconColor?: string;
}

export const BlastRadiusItem = memo<BlastRadiusItemProps>(({ item, defaultIconColor }) => {
  const { euiTheme } = useEuiTheme();
  const { iconType, iconColor, text, status } = item;

  return (
    <li style={{ listStyle: 'none' }}>
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false} style={{ paddingTop: euiTheme.size.xs }}>
          <EuiIcon type={iconType} color={iconColor ?? defaultIconColor} size="s" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{text}</EuiText>
        </EuiFlexItem>
        {status && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={status.iconType ?? 'check'}
                  color={status.color ?? 'success'}
                  size="s"
                  aria-hidden
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color={status.color === 'danger' ? 'danger' : 'success'}>
                  {status.label}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </li>
  );
});

BlastRadiusItem.displayName = 'BlastRadiusItem';
