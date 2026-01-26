/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import type { SpacerSize } from '@elastic/eui/src/components/spacer/spacer';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import { PanelText } from '../../../../common/components/panel_text';
import * as i18n from './translations';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { useGetMissingResources } from '../../../common/hooks/use_get_missing_resources';
import type { DashboardMigrationStats } from '../../types';
import { useKibana } from '../../../../common/lib/kibana/use_kibana';

interface DashboardMigrationsUploadMissingPanelProps {
  migrationStats: DashboardMigrationStats;
  topSpacerSize?: SpacerSize;
}
export const DashboardMigrationsUploadMissingPanel =
  React.memo<DashboardMigrationsUploadMissingPanelProps>(({ migrationStats, topSpacerSize }) => {
    const [missingResources, setMissingResources] = useState<SiemMigrationResourceBase[]>([]);
    const { getMissingResources, isLoading } = useGetMissingResources(
      'dashboard',
      setMissingResources
    );

    useEffect(() => {
      getMissingResources(migrationStats.id);
    }, [getMissingResources, migrationStats.id]);

    if (isLoading || missingResources.length === 0) {
      return null;
    }

    return (
      <DashboardMigrationsUploadMissingPanelContent
        migrationStats={migrationStats}
        topSpacerSize={topSpacerSize}
        missingResources={missingResources}
      />
    );
  });

DashboardMigrationsUploadMissingPanel.displayName = 'DashboardMigrationsUploadMissingPanel';

interface DashboardMigrationsUploadMissingPanelContentProps
  extends DashboardMigrationsUploadMissingPanelProps {
  missingResources: SiemMigrationResourceBase[];
}
const DashboardMigrationsUploadMissingPanelContent =
  React.memo<DashboardMigrationsUploadMissingPanelContentProps>(
    ({ migrationStats, topSpacerSize, missingResources }) => {
      const { euiTheme } = useEuiTheme();
      const { openFlyout } = useMigrationDataInputContext();
      const { telemetry } = useKibana().services.siemMigrations.dashboards;

      const onOpenFlyout = useCallback(() => {
        openFlyout(migrationStats);
        telemetry.reportSetupMigrationOpenResources({
          migrationId: migrationStats.id,
          missingResourcesCount: missingResources.length,
          vendor: migrationStats.vendor,
        });
      }, [migrationStats, openFlyout, telemetry, missingResources.length]);

      return (
        <>
          {topSpacerSize && <EuiSpacer size={topSpacerSize} />}
          <EuiPanel
            hasShadow={false}
            hasBorder
            paddingSize="s"
            css={{ backgroundColor: euiTheme.colors.backgroundBasePrimary }}
            data-test-subj="uploadMissingPanel"
          >
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <AssistantIcon />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <PanelText data-test-subj="uploadMissingPanelTitle" size="s" semiBold>
                  {i18n.DASHBOARD_MIGRATION_UPLOAD_MISSING_RESOURCES_TITLE}
                </PanelText>
              </EuiFlexItem>
              <EuiFlexItem>
                <PanelText data-test-subj="uploadMissingPanelDescription" size="s" subdued>
                  {i18n.DASHBOARD_MIGRATION_UPLOAD_MISSING_RESOURCES_DESCRIPTION}
                </PanelText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="primary"
                  onClick={onOpenFlyout}
                  iconType="download"
                  iconSide="right"
                  size="s"
                  data-test-subj="uploadMissingPanelButton"
                >
                  {i18n.DASHBOARD_MIGRATION_UPLOAD_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </>
      );
    }
  );
DashboardMigrationsUploadMissingPanelContent.displayName =
  'DashboardMigrationsUploadMissingPanelContent';
