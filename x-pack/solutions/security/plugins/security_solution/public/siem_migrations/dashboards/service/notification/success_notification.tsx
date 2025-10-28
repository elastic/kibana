/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';
import {
  SecurityPageName,
  useNavigation,
  NavigationProvider,
} from '@kbn/security-solution-navigation';
import type { ToastInput } from '@kbn/core-notifications-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DashboardMigrationTaskStats } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';

export const getSuccessToast = (
  migrationStats: DashboardMigrationTaskStats,
  core: CoreStart
): ToastInput => ({
  color: 'success',
  iconType: 'check',
  toastLifeTimeMs: 1000 * 60 * 30, // 30 minutes
  title: i18n.translate(
    'xpack.securitySolution.siemMigrations.dashboardsService.polling.successTitle',
    {
      defaultMessage: 'Dashboards translation complete.',
    }
  ),
  text: toMountPoint(
    <NavigationProvider core={core}>
      <SuccessToastContent migrationStats={migrationStats} />
    </NavigationProvider>,
    core
  ),
});

const SuccessToastContent: React.FC<{ migrationStats: DashboardMigrationTaskStats }> = ({
  migrationStats,
}) => {
  const { navigateTo, getAppUrl } = useNavigation();

  const navParams = useMemo(() => {
    return { deepLinkId: SecurityPageName.siemMigrationsDashboards, path: migrationStats.id };
  }, [migrationStats.id]);

  const onClick: React.MouseEventHandler = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateTo({
        deepLinkId: SecurityPageName.siemMigrationsDashboards,
        path: migrationStats.id,
      });
    },
    [navigateTo, migrationStats.id]
  );
  const url = useMemo(() => getAppUrl(navParams), [getAppUrl, navParams]);

  return (
    <EuiFlexGroup direction="column" alignItems="flexEnd" gutterSize="s">
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.dashboardsService.polling.successText"
          defaultMessage='Migration "{name}" has finished. Results have been added to the translated dashboards page.'
          values={{ name: migrationStats.name }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton onClick={onClick} href={url} color="success">
          {i18n.translate(
            'xpack.securitySolution.siemMigrations.dashboardsService.polling.successLinkText',
            { defaultMessage: 'Go to translated dashboards' }
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
