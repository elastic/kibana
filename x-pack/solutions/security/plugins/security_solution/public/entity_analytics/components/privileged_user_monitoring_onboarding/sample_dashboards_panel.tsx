/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, EuiSpacer, EuiTextColor, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PrivilegedUserMonitoringSampleDashboard } from './components/sample_dashboard/sample_dashboard';

export const PrivilegedUserMonitoringSampleDashboardsPanel = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      color="warning"
      hasBorder={false}
      paddingSize="none"
      className="test"
      css={css`
        border: ${euiTheme.border.width.thick} solid ${euiTheme.colors.warning};
      `}
    >
      <DashboardsSectionHeader />
      <PrivilegedUserMonitoringSampleDashboard />
      <EuiSpacer size="s" />
    </EuiPanel>
  );
};
const DashboardsSectionHeader = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      color="warning"
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      css={css`
        position: sticky;
        top: 0;
        z-index: ${euiTheme.levels.header};
        top: var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0));
      `}
    >
      <EuiSpacer size="s" />
      <EuiTitle size="xxs" className="eui-textCenter" textTransform="uppercase">
        <h3>
          <EuiTextColor color="warning">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.sampleDashboard.title"
              defaultMessage="Sample Dashboard"
            />
          </EuiTextColor>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
    </EuiPanel>
  );
};
