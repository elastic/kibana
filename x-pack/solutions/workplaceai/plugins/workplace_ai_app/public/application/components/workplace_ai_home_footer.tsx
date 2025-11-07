/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import { DASHBOARD_APP_ID } from '@kbn/deeplinks-analytics';
import { useKibana } from '../hooks/use_kibana';

export const WorkplaceAIHomeFooter: React.FC = () => {
  const {
    services: { application, chrome },
  } = useKibana();

  const onBrowseDashboards = useCallback(() => {
    const dashboardsUrl = chrome?.navLinks.get(DASHBOARD_APP_ID)?.url;

    if (dashboardsUrl) {
      application?.navigateToUrl(dashboardsUrl);
    }
  }, [application, chrome]);

  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem>
        <EuiPanel paddingSize="l">
          <EuiTitle size="xs">
            <h5>Browse dashboards</h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>Learn how to create dashboards to Measure adoption, trust, and performance.</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton color="text" onClick={onBrowseDashboards}>
            Explore dashboards
          </EuiButton>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="l">
          <EuiTitle size="xs">
            <h5>Use a workflow template</h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>Try prebuilt automations (e.g., summarize tickets, draft status reports).</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton color="text" onClick={() => {}}>
            Browse templates
          </EuiButton>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
