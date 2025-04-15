/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';
import { SIEM_MIGRATION_MANAGER_LICENSE_BTN } from '../messages';

export const SiemMigrationStartUpsellSection = React.memo(function SiemMigrationStartUpsellSection({
  title,
  upgradeMessage,
  upgradeHref,
}: {
  title: React.ReactNode;
  upgradeMessage: React.ReactNode;
  upgradeHref?: string;
}) {
  return (
    <>
      <EuiPanel data-test-subj="siemMigrationStartUpsellSection" paddingSize="none" hasBorder>
        <EuiCallOut
          data-test-subj="siemMigrationStartUpsellTitle"
          title={title}
          color="warning"
          iconType="lock"
        >
          <EuiFlexGroup>
            <EuiFlexItem grow={true}>
              <EuiText size="s" data-test-subj="siemMigrationStartUpsellMessage">
                {upgradeMessage}
              </EuiText>
            </EuiFlexItem>
            {upgradeHref ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="siemMigrationStartUpsellHref"
                  href={upgradeHref}
                  color="warning"
                  fill
                >
                  {SIEM_MIGRATION_MANAGER_LICENSE_BTN}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiCallOut>
      </EuiPanel>
    </>
  );
});
