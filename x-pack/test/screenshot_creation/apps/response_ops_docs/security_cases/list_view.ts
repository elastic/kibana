/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService, getPageObjects }: FtrProviderContext) {
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'security_cases'];
  const pageObjects = getPageObjects(['common', 'header']);

  describe('list view', function () {
    before(async () => {
      await cases.api.createCase({
        title: 'Unusual processes identified',
        tags: ['linux', 'os processes'],
        description: 'Test.',
        owner: 'securitySolution',
        severity: CaseSeverity.HIGH,
      });

      await cases.api.createCase({
        title: 'Suspicious emails reported',
        tags: ['email', 'phishing'],
        description: 'Test.',
        owner: 'securitySolution',
      });

      await cases.api.createCase({
        title: 'Malware investigation',
        tags: ['malware'],
        description: 'Test.',
        owner: 'securitySolution',
        severity: CaseSeverity.MEDIUM,
      });
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('cases list screenshot', async () => {
      await pageObjects.common.navigateToApp('security', { path: 'cases' });
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot('cases-home-page', screenshotDirectories, 1700, 1024);
    });
  });
}
