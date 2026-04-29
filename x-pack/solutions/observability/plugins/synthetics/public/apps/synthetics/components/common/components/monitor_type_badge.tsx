/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, MouseEvent } from 'react';
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormMonitorType, MonitorTypeEnum } from '../../../../../../common/runtime_types';

// EuiBadge doesn't expose a `size` prop, but its default is too tall for dense
// table rows. Apply a compact style override when `size="s"` so callers (e.g.
// the compact monitors table) get a slimmer badge without affecting the
// detail/management UIs that use the default presentation.
const COMPACT_BADGE_STYLE: CSSProperties = {
  fontSize: 11,
  lineHeight: '16px',
  padding: '0 4px',
};

export function MonitorTypeBadge({
  monitorType,
  ariaLabel,
  onClick,
  size = 'm',
}: {
  monitorType: string;
  ariaLabel?: string;
  onClick?: () => void;
  size?: 's' | 'm';
}) {
  const style = size === 's' ? COMPACT_BADGE_STYLE : undefined;
  return onClick ? (
    <EuiBadge
      onClick={onClick}
      onClickAriaLabel={getFilterTitle(monitorType)}
      title={ariaLabel}
      aria-label={ariaLabel}
      iconType={getMonitorTypeBadgeIcon(monitorType)}
      style={style}
      onMouseDown={(e: MouseEvent) => {
        // Prevents the click event from being propagated to the @elastic/chart metric
        e.stopPropagation();
      }}
    >
      {getMonitorTypeBadgeTitle(monitorType)}
    </EuiBadge>
  ) : (
    <EuiBadge
      title={ariaLabel}
      aria-label={ariaLabel}
      iconType={getMonitorTypeBadgeIcon(monitorType)}
      style={style}
      onMouseDown={(e: MouseEvent) => {
        // Prevents the click event from being propagated to the @elastic/chart metric
        e.stopPropagation();
      }}
    >
      {getMonitorTypeBadgeTitle(monitorType)}
    </EuiBadge>
  );
}

const getFilterTitle = (type: string) => {
  return i18n.translate('xpack.synthetics.management.monitorList.monitorTypeBadge.filter', {
    defaultMessage: 'Click to filter monitors for type: {type}',
    values: { type: getMonitorTypeBadgeTitle(type) },
  });
};

function getMonitorTypeBadgeTitle(monitorType: string) {
  switch (monitorType) {
    case FormMonitorType.TCP:
    case FormMonitorType.HTTP:
    case FormMonitorType.ICMP:
      return monitorType.toUpperCase();
    case FormMonitorType.SINGLE:
      return 'Page';
    case FormMonitorType.MULTISTEP:
      return 'Journey';
  }

  switch (monitorType) {
    case MonitorTypeEnum.BROWSER:
      return 'Journey';
    default:
      return monitorType.toUpperCase();
  }
}

function getMonitorTypeBadgeIcon(monitorType: string) {
  return monitorType === 'browser' ? 'videoPlayer' : 'online';
}
