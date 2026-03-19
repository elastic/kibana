/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiToolTip, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useMonitorIntegrationHealth } from '../../common/hooks/use_monitor_integration_health';

export const UnhealthyCountBadge = ({ item }: { item: { id: string } }) => {
  const { getUnhealthyMonitorCountForLocation, getUnhealthyConfigIdsForLocation, statuses, isAgentLevelIssue } =
    useMonitorIntegrationHealth();

  const unhealthyMonitorCount = getUnhealthyMonitorCountForLocation(item.id);

  if (unhealthyMonitorCount === 0) {
    return null;
  }

  const configIds = getUnhealthyConfigIdsForLocation(item.id);
  const allAgentLevelIssues = configIds.every((configId) => {
    const locationStatuses = statuses.get(configId);
    return locationStatuses
      ?.filter((s) => s.locationId === item.id && s.isUnhealthy)
      .every((s) => isAgentLevelIssue(s.status));
  });

  const tooltip = allAgentLevelIssues ? AGENT_ISSUE_TOOLTIP : UNHEALTHY_MONITORS_TOOLTIP;

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={tooltip}>
        <EuiBadge color="warning" data-test-subj="syntheticsLocationMissingIntegrationBadge">
          {i18n.translate('xpack.synthetics.privateLocations.missingIntegrations.count', {
            defaultMessage: '{count} {count, plural, one {unhealthy} other {unhealthy}}',
            values: { count: unhealthyMonitorCount },
          })}
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
  );
};

const UNHEALTHY_MONITORS_TOOLTIP = i18n.translate(
  'xpack.synthetics.privateLocations.missingIntegrations.tooltip',
  {
    defaultMessage: 'These monitors are unhealthy and will not run until they are resolved.',
  }
);

const AGENT_ISSUE_TOOLTIP = i18n.translate(
  'xpack.synthetics.privateLocations.agentIssue.tooltip',
  {
    defaultMessage:
      'These monitors are unhealthy due to agent issues. Check the Fleet agent status for this location.',
  }
);
