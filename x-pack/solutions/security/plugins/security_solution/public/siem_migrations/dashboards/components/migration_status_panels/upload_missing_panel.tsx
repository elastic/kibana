/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import type { SpacerSize } from '@elastic/eui/src/components/spacer/spacer';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import { PanelText } from '../../../../common/components/panel_text';
import * as i18n from './translations';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import { useGetMissingResources } from '../../../common/hooks/use_get_missing_resources';
import type { DashboardMigrationStats } from '../../types';

interface DashboardMigrationsUploadMissingPanelProps {
  migrationStats: DashboardMigrationStats;
  topSpacerSize?: SpacerSize;
}
export const DashboardMigrationsUploadMissingPanel =
  React.memo<DashboardMigrationsUploadMissingPanelProps>(({ migrationStats, topSpacerSize }) => {
    const [missingResources, setMissingResources] = useState<SiemMigrationResourceBase[]>([]);
    const { mutate: getMissingResources, isLoading } = useGetMissingResources(
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
      const { data: translationStats, isLoading: isLoadingTranslationStats } =
        useGetMigrationTranslationStats(migrationStats.id);

      const totalDashboardsToRetry = useMemo(() => {
        if (!translationStats) return 0;

        return (
          (translationStats.dashboards.failed ?? 0) +
          (translationStats.dashboards.success.result.partial ?? 0) +
          (translationStats.dashboards.success.result.untranslatable ?? 0)
        );
      }, [translationStats]);

      const onOpenFlyout = () => {
        // TODO: Implement dashboard-specific flyout logic when available
      };

      return (
        <>
          {topSpacerSize && <EuiSpacer size={topSpacerSize} />}
          <EuiPanel
            hasShadow={false}
            hasBorder
            paddingSize="s"
            css={{ backgroundColor: euiTheme.colors.backgroundBasePrimary }}
          >
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <AssistantIcon />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <PanelText size="s" semiBold>
                  {i18n.DASHBOARD_MIGRATION_UPLOAD_MISSING_RESOURCES_TITLE}
                </PanelText>
              </EuiFlexItem>
              <EuiFlexItem>
                {isLoadingTranslationStats ? (
                  <EuiLoadingSpinner size="s" />
                ) : (
                  <PanelText size="s" subdued>
                    {i18n.DASHBOARD_MIGRATION_UPLOAD_MISSING_RESOURCES_DESCRIPTION(
                      totalDashboardsToRetry
                    )}
                  </PanelText>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="primary"
                  onClick={onOpenFlyout}
                  iconType="download"
                  iconSide="right"
                  size="s"
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
