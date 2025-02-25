/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { Assets } from '@kbn/slo-schema';
import { isEmpty } from 'lodash';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';

interface Props {
  assets: Assets;
}

export function LinkedDashboards({ assets }: Props) {
  const {
    services: { share },
  } = useKibana();

  const dashboardLocator = share.url.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  const dashboardAssets = assets.filter((asset) => asset.type === 'dashboard');
  if (isEmpty(dashboardAssets)) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {dashboardAssets.map((dashboardAsset) => {
        return (
          <EuiFlexItem grow={false} key={dashboardAsset.id}>
            <EuiLink
              data-test-subj="dashboardAssetLink"
              href={dashboardLocator?.getRedirectUrl({ dashboardId: dashboardAsset.id })}
              target="_blank"
            >
              {dashboardAsset.name}
            </EuiLink>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
