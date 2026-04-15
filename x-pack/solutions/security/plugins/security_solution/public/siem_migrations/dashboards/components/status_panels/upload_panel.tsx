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
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import { SiemMigrationsIcon } from '../../../common/icon';
import * as i18n from './translations';
import { START_MIGRATION_TITLE_CLASS_NAME } from '../../../common/styles';
import { useUploadPanelStyles } from '../../../common/styles/upload_panel.styles';
import { useMigrationDataInputContext, MigrationsReadMore } from '../../../common/components';
import type { DashboardMigrationStats } from '../../types';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

export interface UploadDashboardsPanelProps {
  isUploadMore?: boolean;
  isDisabled?: boolean;
  migrationStats?: DashboardMigrationStats;
}

export interface UploadDashboardsSectionPanelProps extends UploadDashboardsPanelProps {
  onOpenFlyout?: React.MouseEventHandler;
}

export const UploadDashboardsSectionPanel = React.memo<UploadDashboardsSectionPanelProps>(
  function UploadDashboardsSectionPanel({
    isUploadMore = false,
    isDisabled = false,
    onOpenFlyout,
  }) {
    const styles = useUploadPanelStyles(isUploadMore);

    return (
      <EuiPanel hasShadow={false} hasBorder paddingSize={isUploadMore ? 'm' : 'l'}>
        <EuiFlexGroup
          direction="row"
          alignItems="center"
          className={styles}
          gutterSize={isUploadMore ? 'm' : 'l'}
        >
          <EuiFlexItem grow={false}>
            <SiemMigrationsIcon className="siemMigrationsIcon" />
          </EuiFlexItem>
          <EuiFlexItem>
            {isUploadMore ? (
              <EuiText size="s" className={START_MIGRATION_TITLE_CLASS_NAME}>
                <p>{i18n.START_DASHBOARD_MIGRATION_CARD_UPLOAD_MORE_TITLE}</p>
              </EuiText>
            ) : (
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText size="m" className={START_MIGRATION_TITLE_CLASS_NAME}>
                    <p>{i18n.START_DASHBOARD_MIGRATION_CARD_UPLOAD_TITLE}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <p>{i18n.START_DASHBOARD_MIGRATION_CARD_UPLOAD_DESCRIPTION}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <MigrationsReadMore migrationType="dashboard" />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isUploadMore ? (
              <EuiButtonEmpty
                data-test-subj="startDashboardMigrationUploadMoreButton"
                iconType="download"
                iconSide="right"
                onClick={onOpenFlyout}
                isDisabled={isDisabled}
              >
                {i18n.START_DASHBOARD_MIGRATION_CARD_UPLOAD_MORE_BUTTON}
              </EuiButtonEmpty>
            ) : (
              <EuiButton
                data-test-subj="startDashboardMigrationUploadDashboardsButton"
                iconType="download"
                iconSide="right"
                onClick={onOpenFlyout}
                isDisabled={isDisabled}
              >
                {i18n.START_DASHBOARD_MIGRATION_CARD_UPLOAD_BUTTON}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

export const UploadDashboardsPanel = React.memo<UploadDashboardsPanelProps>(
  function UploadDashboardsPanel({
    isUploadMore = false,
    isDisabled = false,
    migrationStats,
  }: UploadDashboardsPanelProps) {
    const { openFlyout } = useMigrationDataInputContext();
    const { telemetry } = useKibana().services.siemMigrations.dashboards;
    const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
      openFlyout(migrationStats);
      telemetry.reportSetupMigrationOpen({
        isFirstMigration: !isUploadMore,
      });
    }, [openFlyout, migrationStats, telemetry, isUploadMore]);

    return (
      <UploadDashboardsSectionPanel
        isDisabled={isDisabled}
        isUploadMore={isUploadMore}
        onOpenFlyout={onOpenFlyout}
      />
    );
  }
);

UploadDashboardsPanel.displayName = 'UploadDashboardsPanel';
