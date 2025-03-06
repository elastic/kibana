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
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { RuleMigrationResourceBase } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { PanelText } from '../../../../common/components/panel_text';
import { useGetMissingResources } from '../../service/hooks/use_get_missing_resources';
import * as i18n from './translations';
import { useRuleMigrationDataInputContext } from '../data_input_flyout/context';
import type { RuleMigrationStats } from '../../types';

interface RuleMigrationsUploadMissingPanelProps {
  migrationStats: RuleMigrationStats;
  topSpacerSize?: SpacerSize;
}
export const RuleMigrationsUploadMissingPanel = React.memo<RuleMigrationsUploadMissingPanelProps>(
  ({ migrationStats, topSpacerSize }) => {
    const { euiTheme } = useEuiTheme();
    const { telemetry } = useKibana().services.siemMigrations.rules;
    const { openFlyout } = useRuleMigrationDataInputContext();
    const [missingResources, setMissingResources] = useState<RuleMigrationResourceBase[]>([]);
    const { getMissingResources, isLoading } = useGetMissingResources(setMissingResources);

    useEffect(() => {
      getMissingResources(migrationStats.id);
    }, [getMissingResources, migrationStats.id]);

    const onOpenFlyout = useCallback(() => {
      openFlyout(migrationStats);
      telemetry.reportSetupMigrationOpenResources({
        migrationId: migrationStats.id,
        missingResourcesCount: missingResources.length,
      });
    }, [migrationStats, openFlyout, missingResources, telemetry]);

    if (isLoading || missingResources.length === 0) {
      return null;
    }
    return (
      <>
        {topSpacerSize && <EuiSpacer size={topSpacerSize} />}
        <EuiPanel
          hasShadow={false}
          hasBorder
          paddingSize="s"
          style={{ backgroundColor: euiTheme.colors.backgroundBasePrimary }}
        >
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <AssistantIcon />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <PanelText size="s" semiBold>
                {i18n.RULE_MIGRATION_UPLOAD_MISSING_RESOURCES_TITLE}
              </PanelText>
            </EuiFlexItem>
            <EuiFlexItem>
              <PanelText size="s" subdued>
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
RuleMigrationsUploadMissingPanel.displayName = 'RuleMigrationsUploadMissingPanel';
