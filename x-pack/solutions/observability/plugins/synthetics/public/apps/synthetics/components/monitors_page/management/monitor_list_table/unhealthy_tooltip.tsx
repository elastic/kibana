/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
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
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        {unhealthyStatuses.map((s) => (
          <EuiFlexItem key={s.locationId} grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <span>•</span>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{s.locationLabel}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {getStatusLabel(s.status) ?? UNHEALTHY_TOOLTIP_BADGE}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
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
