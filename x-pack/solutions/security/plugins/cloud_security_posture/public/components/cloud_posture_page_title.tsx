/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const CloudPosturePageTitle = ({ title, isBeta }: { title: string; isBeta?: boolean }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiTitle>
        <h1>{title}</h1>
      </EuiTitle>
    </EuiFlexItem>
    {isBeta && (
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          label="Beta"
          tooltipContent={
            <FormattedMessage
              id="xpack.csp.cloudPosturePage.betaLabel"
              defaultMessage="This functionality is in beta and is subject to change. The design and code is less mature than official generally available features and is being provided as-is with no warranties. Beta features are not subject to the support service level agreement of official generally available features."
            />
          }
          tooltipPosition="bottom"
        />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
