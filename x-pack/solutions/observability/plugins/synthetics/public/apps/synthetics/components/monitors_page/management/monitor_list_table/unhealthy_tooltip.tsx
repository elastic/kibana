/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiIcon } from '@elastic/eui';
import React from 'react';
import { useMonitorIntegrationHealth } from '../../../common/hooks/use_monitor_integration_health';
import { getStatusLabel } from '../../../common/hooks/status_labels';

export const UnhealthyTooltip = ({ configId }: { configId: string }) => {
  const { isUnhealthy: isMonitorUnhealthy, getUnhealthyLocationStatuses } =
    useMonitorIntegrationHealth();

  const isUnhealthy = isMonitorUnhealthy(configId);
  const unhealthyStatuses = getUnhealthyLocationStatuses(configId);

  const tooltipContent =
    unhealthyStatuses.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {unhealthyStatuses.map((s) => (
          <div key={s.locationId} style={{ display: 'flex', gap: '6px' }}>
            <span style={{ minWidth: '6px' }}>•</span>
            <div>
              <div style={{ fontWeight: 600 }}>{s.locationLabel}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {getStatusLabel(s.status) ?? UNHEALTHY_TOOLTIP_BADGE}
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      UNHEALTHY_TOOLTIP_BADGE
    );

  if (!isUnhealthy) {
    return null;
  }

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiIcon
        type="warning"
        color="warning"
        data-test-subj="syntheticsUnhealthyTooltipBadge"
        aria-label={UNHEALTHY_TOOLTIP_BADGE}
      />
    </EuiToolTip>
  );
};

const UNHEALTHY_TOOLTIP_BADGE = i18n.translate(
  'xpack.synthetics.management.monitorList.unhealthyTooltip.badge',
  {
    defaultMessage: 'Unhealthy',
  }
);
