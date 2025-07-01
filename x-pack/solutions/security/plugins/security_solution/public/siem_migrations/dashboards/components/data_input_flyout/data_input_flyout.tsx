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
import * as i18n from './translations';

export const DashboardMigrationDataInputFlyout = React.memo(
  function DashboardMigrationDataInputFlyout() {
    const onClose = () => {};
    const isRetry = false; // This would be determined by your application logic
    return (
      <EuiFlyoutResizable
        onClose={() => {}}
        ownFocus
        data-test-subj="dashboardMigrationDataInputFlyout"
        aria-labelledby="dashboardMigrationDataInputFlyoutTitle"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m" id="dashboardMigrationDataInputFlyoutTitle">
            <EuiText>{i18n.DATA_INPUT_FLYOUT_TITLE}</EuiText>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody />
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
