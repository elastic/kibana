/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const EntityAnalyticsRecentAnomalies = () => {
  return (
    <EuiFlexItem data-test-subj="recent-anomalies-panel">
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.homePage.recentAnomalies"
            defaultMessage="Recent anomalies"
          />
        </h3>
      </EuiTitle>
    </EuiFlexItem>
  );
};
