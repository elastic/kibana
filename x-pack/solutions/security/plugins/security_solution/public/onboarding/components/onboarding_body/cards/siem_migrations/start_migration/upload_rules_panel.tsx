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
  EuiIcon,
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';
import { RuleMigrationsReadMore } from '../../../../../../siem_migrations/rules/components/migration_status_panels/read_more';
import { SiemMigrationsIcon } from '../../../../../../siem_migrations/common/icon';
import * as i18n from './translations';
import { TITLE_CLASS_NAME } from './start_migration_card.styles';
import { useRuleMigrationDataInputContext } from '../../../../../../siem_migrations/rules/components/data_input_flyout/context';
import { useStyles } from './upload_rules_panel.styles';

export interface UploadRulesPanelProps {
  isUploadMore?: boolean;
  isDisabled?: boolean;
}
export const UploadRulesPanel = React.memo<UploadRulesPanelProps>(
  ({ isUploadMore = false, isDisabled = false }) => {
    const styles = useStyles(isUploadMore);
    const { telemetry } = useKibana().services.siemMigrations.rules;
    const { openFlyout } = useRuleMigrationDataInputContext();

    const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
      openFlyout();
      telemetry.reportSetupMigrationOpen({ isFirstMigration: !isUploadMore });
    }, [openFlyout, telemetry, isUploadMore]);

    return (
      <EuiPanel hasShadow={false} hasBorder paddingSize={isUploadMore ? 'm' : 'l'}>
        <EuiFlexGroup
          direction="row"
          alignItems="center"
          className={styles}
          gutterSize={isUploadMore ? 'm' : 'l'}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type={SiemMigrationsIcon} className="siemMigrationsIcon" />
          </EuiFlexItem>
          <EuiFlexItem>
            {isUploadMore ? (
              <EuiText size="s" className={TITLE_CLASS_NAME}>
                <p>{i18n.START_MIGRATION_CARD_UPLOAD_MORE_TITLE}</p>
              </EuiText>
            ) : (
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText size="m" className={TITLE_CLASS_NAME}>
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
                iconType="download"
                iconSide="right"
                onClick={onOpenFlyout}
                isDisabled={isDisabled}
              >
                {i18n.START_MIGRATION_CARD_UPLOAD_MORE_BUTTON}
              </EuiButtonEmpty>
            ) : (
              <EuiButton
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
UploadRulesPanel.displayName = 'UploadRulesPanel';
