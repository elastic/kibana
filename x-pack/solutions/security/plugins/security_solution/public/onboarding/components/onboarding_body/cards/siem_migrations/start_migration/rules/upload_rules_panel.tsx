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
import { useMigrationDataInputContext } from '../../../../../../../siem_migrations/common/components/migration_data_input_flyout_context';
import { useUploadPanelStyles } from '../../../../../../../siem_migrations/common/styles/upload_panel.styles';
import { START_MIGRATION_TITLE_CLASS_NAME } from '../../../../../../../siem_migrations/common/styles';
import { useKibana } from '../../../../../../../common/lib/kibana/kibana_react';
import { RuleMigrationsReadMore } from '../../../../../../../siem_migrations/rules/components/migration_status_panels/read_more';
import { SiemMigrationsIcon } from '../../../../../../../siem_migrations/common/icon';
import * as i18n from './translations';

export interface UploadRulesPanelProps {
  isUploadMore?: boolean;
  isDisabled?: boolean;
}

export interface UploadRulesSectionPanelProps extends UploadRulesPanelProps {
  onOpenFlyout?: React.MouseEventHandler;
}

export const UploadRulesSectionPanel = React.memo<UploadRulesSectionPanelProps>(
  function UploadRulesSectionPanel({ isUploadMore = false, isDisabled = false, onOpenFlyout }) {
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
                <p>{i18n.START_MIGRATION_CARD_UPLOAD_MORE_TITLE}</p>
              </EuiText>
            ) : (
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText size="m" className={START_MIGRATION_TITLE_CLASS_NAME}>
                    <p>{i18n.START_MIGRATION_CARD_UPLOAD_TITLE}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <p>{i18n.START_MIGRATION_CARD_UPLOAD_DESCRIPTION}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <RuleMigrationsReadMore />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isUploadMore ? (
              <EuiButtonEmpty
                data-test-subj="startMigrationUploadMoreButton"
                iconType="download"
                iconSide="right"
                onClick={onOpenFlyout}
                isDisabled={isDisabled}
              >
                {i18n.START_MIGRATION_CARD_UPLOAD_MORE_BUTTON}
              </EuiButtonEmpty>
            ) : (
              <EuiButton
                data-test-subj="startMigrationUploadRulesButton"
                iconType="download"
                iconSide="right"
                onClick={onOpenFlyout}
                isDisabled={isDisabled}
              >
                {i18n.START_MIGRATION_CARD_UPLOAD_BUTTON}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

export const UploadRulesPanel = React.memo<UploadRulesPanelProps>(function UploadRulesPanel({
  isUploadMore = false,
  isDisabled = false,
}: UploadRulesPanelProps) {
  const { telemetry } = useKibana().services.siemMigrations.rules;
  const { openFlyout } = useMigrationDataInputContext();

  const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
    openFlyout();
    telemetry.reportSetupMigrationOpen({ isFirstMigration: !isUploadMore });
  }, [openFlyout, telemetry, isUploadMore]);

  return (
    <UploadRulesSectionPanel
      isDisabled={isDisabled}
      isUploadMore={isUploadMore}
      onOpenFlyout={onOpenFlyout}
    />
  );
});

UploadRulesPanel.displayName = 'UploadRulesPanel';
