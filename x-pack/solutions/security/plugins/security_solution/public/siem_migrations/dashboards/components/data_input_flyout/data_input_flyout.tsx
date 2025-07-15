/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { DashboardsUploadStep } from './steps/upload_dashboards';

interface DashboardMigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationStats: RuleMigrationTaskStats | undefined;
}

export const DashboardMigrationDataInputFlyout = React.memo(
  function DashboardMigrationDataInputFlyout({
    onClose,
    migrationStats,
  }: DashboardMigrationDataInputFlyoutProps) {
    const { closeFlyout } = useMigrationDataInputContext();
    const isRetry = false; // This would be determined by your application logic
    return (
      <EuiFlyoutResizable
        onClose={closeFlyout}
        ownFocus
        data-test-subj="dashboardMigrationDataInputFlyout"
        aria-labelledby="dashboardMigrationDataInputFlyoutTitle"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m" id="dashboardMigrationDataInputFlyoutTitle">
            <EuiText>{i18n.DATA_INPUT_FLYOUT_TITLE}</EuiText>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <DashboardsUploadStep />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>
                <FormattedMessage
                  id="xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={() => {}}
                disabled={false}
                isLoading={false}
                data-test-subj="startMigrationButton"
              >
                {isRetry ? (
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.retryTranslateButton"
                    defaultMessage="Retry translation"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.translateButton"
                    defaultMessage="Translate"
                  />
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyoutResizable>
    );
  }
);
