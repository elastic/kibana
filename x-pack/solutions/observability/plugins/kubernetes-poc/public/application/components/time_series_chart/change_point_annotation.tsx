/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { TickFormatter } from '@elastic/charts';
import type { FormattedChangePoint } from './change_point_utils';
import { getChangePointTypeLabel } from './change_point_utils';

interface ChangePointAnnotationTooltipProps {
  change: FormattedChangePoint;
  xFormatter: TickFormatter;
}

/**
 * Tooltip content for change point annotations
 */
export function ChangePointAnnotationTooltip({
  change,
  xFormatter,
}: ChangePointAnnotationTooltipProps) {
  const theme = useEuiTheme().euiTheme;
  const color = theme.colors[change.color] || theme.colors.darkShade;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      className={css`
        padding: ${theme.size.s};
        background: ${theme.colors.emptyShade};
        border: 1px solid ${theme.colors.lightShade};
        border-radius: ${theme.border.radius.medium};
        box-shadow: ${theme.levels.menu};
        white-space: nowrap;
      `}
    >
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="dot" color={color} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" style={{ fontWeight: 600 }}>
              {i18n.translate('xpack.kubernetesPoc.changePoint.annotationTitle', {
                defaultMessage: 'Change Point Detected',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.kubernetesPoc.changePoint.typeLabel', {
                defaultMessage: 'Type:',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{getChangePointTypeLabel(change.type)}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.kubernetesPoc.changePoint.impactLabel', {
                defaultMessage: 'Impact:',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="dot" color={color} size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{change.label}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          @ {xFormatter(change.timestamp)}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface ChangePointMarkerIconProps {
  change: FormattedChangePoint;
}

/**
 * Marker icon for change point annotations
 */
export function ChangePointMarkerIcon({ change }: ChangePointMarkerIconProps) {
  const theme = useEuiTheme().euiTheme;
  const color = theme.colors[change.color] || theme.colors.darkShade;

  // Use different icons based on change type
  const iconType = getIconForChangeType(change.type);

  return <EuiIcon type={iconType} color={color} size="s" />;
}

/**
 * Get appropriate icon for change point type
 */
function getIconForChangeType(type: string): string {
  switch (type) {
    case 'spike':
      return 'sortUp';
    case 'dip':
      return 'sortDown';
    case 'step_change':
      return 'editorStrike';
    case 'trend_change':
      return 'visLine';
    case 'distribution_change':
      return 'visBarVertical';
    default:
      return 'dot';
  }
}
