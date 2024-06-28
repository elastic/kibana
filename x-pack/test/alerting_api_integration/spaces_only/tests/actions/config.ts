/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../common/config';

export const EmailDomainsAllowed = ['example.org', 'test.com'];

// eslint-disable-next-line import/no-default-export
export default createTestConfig('spaces_only', {
  disabledPlugins: ['security'],
  license: 'trial',
  enableActionsProxy: false,
  verificationMode: 'none',
  customizeLocalHostSsl: true,
  preconfiguredAlertHistoryEsIndex: true,
  emailDomainsAllowed: EmailDomainsAllowed,
  useDedicatedTaskRunner: true,
  testFiles: [require.resolve('.')],
  reportName: 'X-Pack Alerting API Integration Tests - Actions',
  enableFooterInEmail: false,
  experimentalFeatures: ['crowdstrikeConnectorOn'],
});
