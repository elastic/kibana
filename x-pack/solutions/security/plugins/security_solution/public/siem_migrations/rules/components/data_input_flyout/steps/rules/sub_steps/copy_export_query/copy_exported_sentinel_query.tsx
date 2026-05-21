/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const CopyExportedSentinelQuery = React.memo(() => {
  return (
    <EuiText>
      <FormattedMessage
        id="xpack.securitySolution.siemMigrations.copyExportedSentinelQuery.description"
        defaultMessage="In the Microsoft Azure portal, navigate to Microsoft Sentinel and open your workspace. Go to {analyticsRules}, select the rules you want to migrate, and click {export}. Choose {armTemplate} as the export format. The downloaded JSON file contains your Analytics Rules and can be uploaded here."
        values={{
          analyticsRules: (
            <b>
              <FormattedMessage
                id="xpack.securitySolution.siemMigrations.copyExportedSentinelQuery.analyticsRules"
                defaultMessage="Analytics rules"
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
          armTemplate: (
            <b>
              <FormattedMessage
                id="xpack.securitySolution.siemMigrations.copyExportedSentinelQuery.armTemplate"
                defaultMessage="ARM template"
              />
            </b>
          ),
        }}
      />
    </EuiText>
  );
});

CopyExportedSentinelQuery.displayName = 'CopyExportedSentinelQuery';
