/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import { useKibana } from '../../../../common/lib/kibana/use_kibana';
import { PanelText } from '../../../../common/components/panel_text';
import { useGetMissingResources } from '../../../common/hooks/use_get_missing_resources';
import * as i18n from './translations';
import { useMigrationDataInputContext } from '../../../common/components';
import type { RuleMigrationStats } from '../../types';

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

      const onOpenFlyout = useCallback(() => {
        openFlyout(migrationStats);
        telemetry.reportSetupMigrationOpenResources({
          migrationId: migrationStats.id,
          missingResourcesCount: missingResources.length,
          vendor: migrationStats.vendor,
        });
      }, [migrationStats, openFlyout, missingResources, telemetry]);

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
                  {migrationStats.vendor === 'splunk'
                    ? i18n.RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_SPLUNK_TITLE
                    : i18n.RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_QRADAR_TITLE}
                </PanelText>
              </EuiFlexItem>
              <EuiFlexItem>
                <PanelText data-test-subj="uploadMissingPanelDescription" size="s" subdued>
                  {i18n.RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_DESCRIPTION}
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
