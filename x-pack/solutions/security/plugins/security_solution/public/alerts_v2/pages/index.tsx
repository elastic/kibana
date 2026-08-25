/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

/**
 * POC "Alerts v2" page (RnA / Alerting v2). Currently an empty placeholder —
 * routing and navigation only. Content is added in later steps.
 */
export const AlertsV2Page = () => (
  <EuiPageHeader
    bottomBorder
    pageTitle={
      <FormattedMessage
        id="xpack.securitySolution.alertsV2.pageTitle"
        defaultMessage="Alerts v2"
      />
    }
  />
);
