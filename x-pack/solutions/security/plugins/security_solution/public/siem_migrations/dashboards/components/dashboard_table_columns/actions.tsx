/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import { SecurityPageName } from '../../../../../common';
import * as i18n from './translations';
import type { TableColumn } from './constants';
import { TableHeader } from '../../../common/components';
import { InstallDashboardActionBtn } from './install';

interface ActionNameProps {
  shouldDisableActions?: boolean;
  migrationDashboard: DashboardMigrationDashboard;
  installDashboard: (migrationDashboard: DashboardMigrationDashboard) => void;
}

const ActionName = ({
  migrationDashboard,
  installDashboard,
  shouldDisableActions: isDisabled,
}: ActionNameProps) => {
  const onInstall = useCallback(() => {
    installDashboard(migrationDashboard);
  }, [installDashboard, migrationDashboard]);

  // Failed
  if (migrationDashboard.status === SiemMigrationStatus.FAILED) {
    return null;
  }

  // Installed
  if (migrationDashboard.elastic_dashboard?.id) {
    return (
      <SecuritySolutionLinkAnchor
        deepLinkId={SecurityPageName.dashboards}
        path={migrationDashboard.elastic_dashboard.id}
        data-test-subj="viewDashboard"
        disabled={isDisabled}
      >
        {i18n.ACTIONS_VIEW_LABEL}
      </SecuritySolutionLinkAnchor>
    );
  }

  // Installable
  if (
    migrationDashboard.translation_result &&
    (migrationDashboard.translation_result === MigrationTranslationResult.FULL ||
      migrationDashboard.translation_result === MigrationTranslationResult.PARTIAL)
  ) {
    return <InstallDashboardActionBtn isDisabled={isDisabled} onInstall={onInstall} />;
  }
};

export type CreateActionsColumnParams = Omit<ActionNameProps, 'migrationDashboard'>;

export const createActionsColumn = ({
  shouldDisableActions = false,
  installDashboard,
}: CreateActionsColumnParams): TableColumn => {
  return {
    field: 'elastic_dashboard',
    name: (
      <TableHeader
        title={i18n.COLUMN_ACTIONS}
        tooltipContent={
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.dashboards.tableColumn.actionsTooltip"
            defaultMessage="{title}
            {view} - go to the installed dashboard.{lineBreak}
            {install} - install dashboard to view and edit it."
            values={{
              lineBreak: <br />,
              title: (
                <EuiText size="s">
                  <p>
                    <b>{i18n.COLUMN_ACTIONS}</b>
                    <EuiHorizontalRule margin="s" />
                  </p>
                </EuiText>
              ),
              view: <b>{i18n.ACTIONS_VIEW_LABEL}</b>,
              install: <b>{i18n.ACTIONS_INSTALL_LABEL}</b>,
            }}
          />
        }
      />
    ),
    render: (_, dashboard: DashboardMigrationDashboard) => {
      return (
        <ActionName
          migrationDashboard={dashboard}
          installDashboard={installDashboard}
          shouldDisableActions={shouldDisableActions}
        />
      );
    },
    width: '10%',
    align: 'left',
  };
};
