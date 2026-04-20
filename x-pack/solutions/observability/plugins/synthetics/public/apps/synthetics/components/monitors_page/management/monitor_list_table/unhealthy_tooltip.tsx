/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiIconTip, EuiText } from '@elastic/eui';
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
        {unhealthyStatuses.map((s, index) => (
          <EuiFlexItem key={s.locationId} grow={false}>
            <EuiFlexGroup gutterSize="none" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>{s.locationLabel}</strong>
                </EuiText>
                <EuiText size="xs">{getStatusLabel(s.status) ?? UNHEALTHY_TOOLTIP_BADGE}</EuiText>
                {index < unhealthyStatuses.length - 1 && (
                  <EuiHorizontalRule
                    margin="none"
                    css={css`
                      margin-block: 2px;
                    `}
                  />
                )}
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
    <EuiIconTip
      content={tooltipContent}
      type="warning"
      color="warning"
      data-test-subj="syntheticsUnhealthyTooltipBadge"
      aria-label={UNHEALTHY_TOOLTIP_BADGE}
    />
  );
};

const UNHEALTHY_TOOLTIP_BADGE = i18n.translate(
  'xpack.synthetics.management.monitorList.unhealthyTooltip.badge',
  {
    defaultMessage: 'Unhealthy',
  }
);
