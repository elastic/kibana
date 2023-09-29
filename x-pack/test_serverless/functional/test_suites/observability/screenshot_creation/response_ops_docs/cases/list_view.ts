/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_OWNER } from '@kbn/cases-plugin/common';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { navigateToCasesApp } from '../../../../../../shared/lib/cases';

export default function ({ getPageObject, getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'svlCommonPage']);
  const svlCases = getService('svlCases');
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];
  const owner = OBSERVABILITY_OWNER;

  describe('list view', function () {
    before(async () => {
      await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest(owner, {
          title: 'Metrics inventory',
          tags: ['IBM resilient'],
          description: 'Test.',
          owner,
        })
      );

      await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest(owner, {
          title: 'Logs threshold',
          tags: ['jira'],
          description: 'Test.',
          owner,
        })
      );

      await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest(owner, {
          title: 'Monitor uptime',
          tags: ['swimlane'],
          description: 'Test.',
          owner,
        })
      );
    });

    after(async () => {
      await svlCases.api.deleteAllCaseItems();
      await pageObjects.svlCommonPage.forceLogout();
    });

    beforeEach(async () => {
      await pageObjects.svlCommonPage.login();
    });

    it('cases list screenshot', async () => {
      await navigateToCasesApp(getPageObject, getService, owner);
      await svlCommonScreenshots.takeScreenshot('cases', screenshotDirectories, 1700, 1024);
    });
  });
}
