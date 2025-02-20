/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiBadge, EuiBadgeProps } from '@elastic/eui';
import { Agent } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiLightVars as euiVars } from '@kbn/ui-theme';

export const AgentlessConnectorStatusBadge = ({
  status,
  ...restOfProps
}: {
  status: Agent['status'];
} & EuiBadgeProps): React.ReactElement => {
  switch (status) {
    case 'error':
    case 'degraded':
      return (
        <EuiBadge color="warning" {...restOfProps}>
          <FormattedMessage
            id="xpack.enterpriseSearch.connectors.elasticManaged.agentHealth.unhealthyStatusText"
            defaultMessage="Unhealthy"
          />
        </EuiBadge>
      );
    case 'inactive':
      return (
        <EuiBadge color={euiVars.euiColorDarkShade} {...restOfProps}>
          <FormattedMessage
            id="xpack.enterpriseSearch.connectors.elasticManaged.agentHealth.inactiveStatusText"
            defaultMessage="Inactive"
          />
        </EuiBadge>
      );
    case 'offline':
      return (
        <EuiBadge color="default" {...restOfProps}>
          <FormattedMessage
            id="xpack.enterpriseSearch.connectors.elasticManaged.agentHealth.offlineStatusText"
            defaultMessage="Offline"
          />
        </EuiBadge>
      );
    case 'uninstalled':
      return (
        <EuiBadge color="default" {...restOfProps}>
          <FormattedMessage
            id="xpack.enterpriseSearch.connectors.elasticManaged.agentHealth.uninstalledStatusText"
            defaultMessage="Uninstalled"
          />
        </EuiBadge>
      );
    case 'orphaned':
      return (
        <EuiBadge color="warning" {...restOfProps}>
          <FormattedMessage
            id="xpack.enterpriseSearch.connectors.elasticManaged.agentHealth.orphanedStatusText"
            defaultMessage="Orphaned"
          />
        </EuiBadge>
      );

    case 'unenrolling':
    case 'enrolling':
    case 'updating':
      return (
        <EuiBadge color="primary" {...restOfProps}>
          <FormattedMessage
            id="xpack.enterpriseSearch.connectors.elasticManaged.agentHealth.updatingStatusText"
            defaultMessage="Updating"
          />
        </EuiBadge>
      );
    case 'unenrolled':
      return (
        <EuiBadge color={euiVars.euiColorDisabled} {...restOfProps}>
          <FormattedMessage
            id="xpack.enterpriseSearch.connectors.elasticManaged.agentHealth.unenrolledStatusText"
            defaultMessage="Unenrolled"
          />
        </EuiBadge>
      );
    default:
      return (
        <EuiBadge color="success" {...restOfProps}>
          <FormattedMessage
            id="xpack.enterpriseSearch.connectors.elasticManaged.agentHealth.healthyStatusText"
            defaultMessage="Healthy"
          />
        </EuiBadge>
      );
  }
};
