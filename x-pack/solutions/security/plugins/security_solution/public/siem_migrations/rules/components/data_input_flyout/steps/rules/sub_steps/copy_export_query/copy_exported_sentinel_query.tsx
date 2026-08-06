/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const CopyExportedSentinelQuery = React.memo(() => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiText>
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.copyExportedSentinelQuery.description"
            defaultMessage="In the Microsoft Azure portal, navigate to Microsoft Sentinel and open your workspace. Go to {analyticsRules}, select the rules you want to migrate, and click {export}. The downloaded JSON file contains your Analytics Rules and can be uploaded here."
            values={{
              analyticsRules: (
                <b>
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.copyExportedSentinelQuery.analyticsRules"
                    defaultMessage="Analytics"
                  />
                </b>
              ),
              export: (
                <b>
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.copyExportedSentinelQuery.export"
                    defaultMessage="Export"
                  />
                </b>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.securitySolution.siemMigrations.copyExportedSentinelQuery.rulesTypesupport"
              defaultMessage="As of now only Scheduled & Near Real Time(NRT) rules are supported for migration. Please make sure your export file contains only these types of rules."
            />
          }
          size="s"
          iconType="pin"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

CopyExportedSentinelQuery.displayName = 'CopyExportedSentinelQuery';
