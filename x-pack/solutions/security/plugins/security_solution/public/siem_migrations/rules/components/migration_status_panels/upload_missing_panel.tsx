/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { useKibana } from '../../../../common/lib/kibana/use_kibana';
import { PanelText } from '../../../../common/components/panel_text';
import { useGetMissingResources } from '../../../common/hooks/use_get_missing_resources';
import * as i18n from './translations';
import { useMigrationDataInputContext } from '../../../common/components';
import type { RuleMigrationStats } from '../../types';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';

interface RuleMigrationsUploadMissingPanelProps {
  migrationStats: RuleMigrationStats;
  topSpacerSize?: SpacerSize;
}
export const RuleMigrationsUploadMissingPanel = React.memo<RuleMigrationsUploadMissingPanelProps>(
  ({ migrationStats, topSpacerSize }) => {
    const [missingResources, setMissingResources] = useState<SiemMigrationResourceBase[]>([]);
    const { getMissingResources, isLoading } = useGetMissingResources('rule', setMissingResources);

    useEffect(() => {
      getMissingResources(migrationStats.id);
    }, [getMissingResources, migrationStats.id]);

    if (isLoading || missingResources.length === 0) {
      return null;
    }

    return (
      <RuleMigrationsUploadMissingPanelContent
        migrationStats={migrationStats}
        topSpacerSize={topSpacerSize}
        missingResources={missingResources}
      />
    );
  }
);
RuleMigrationsUploadMissingPanel.displayName = 'RuleMigrationsUploadMissingPanel';

interface RuleMigrationsUploadMissingPanelContentProps
  extends RuleMigrationsUploadMissingPanelProps {
  missingResources: SiemMigrationResourceBase[];
}
const RuleMigrationsUploadMissingPanelContent =
  React.memo<RuleMigrationsUploadMissingPanelContentProps>(
    ({ migrationStats, topSpacerSize, missingResources }) => {
      const { euiTheme } = useEuiTheme();
      const { telemetry } = useKibana().services.siemMigrations.rules;
      const { openFlyout } = useMigrationDataInputContext();

      const { data: translationStats, isLoading: isLoadingTranslationStats } =
        useGetMigrationTranslationStats(migrationStats.id);

      const onOpenFlyout = useCallback(() => {
        openFlyout(migrationStats);
        telemetry.reportSetupMigrationOpenResources({
          migrationId: migrationStats.id,
          missingResourcesCount: missingResources.length,
        });
      }, [migrationStats, openFlyout, missingResources, telemetry]);

      const totalRulesToRetry = useMemo(() => {
        return (
          (translationStats?.rules.failed ?? 0) +
          (translationStats?.rules.success.result.partial ?? 0) +
          (translationStats?.rules.success.result.untranslatable ?? 0)
        );
      }, [translationStats]);

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
                  {i18n.RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_TITLE}
                </PanelText>
              </EuiFlexItem>
              <EuiFlexItem>
                {isLoadingTranslationStats ? (
                  <EuiLoadingSpinner size="s" />
                ) : (
                  <PanelText data-test-subj="uploadMissingPanelDescription" size="s" subdued>
                    {i18n.RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_DESCRIPTION(totalRulesToRetry)}
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
                  data-test-subj="uploadMissingPanelButton"
                >
                  {i18n.RULE_MIGRATION_UPLOAD_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </>
      );
    }
  );
RuleMigrationsUploadMissingPanelContent.displayName = 'RuleMigrationsUploadMissingPanelContent';
