/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');

  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];

  describe('list view', function () {
    before(async () => {
      const { id: caseIdMetrics } = await cases.api.createCase({
        title: 'Metrics inventory',
        tags: ['IBM resilient'],
        description: 'Test.',
        owner: 'observability',
      });
      await cases.api.createAttachment({
        caseId: caseIdMetrics,
        params: { comment: 'test comment', type: CommentType.user, owner: 'observability' },
      });
      await cases.api.createAttachment({
        caseId: caseIdMetrics,
        params: { comment: '2nd test comment', type: CommentType.user, owner: 'observability' },
      });

      const { id: caseIdLogs, version: caseVersionLogs } = await cases.api.createCase({
        title: 'Logs threshold',
        tags: ['jira'],
        description: 'Test.',
        owner: 'observability',
      });
      await cases.api.setStatus(caseIdLogs, caseVersionLogs, 'closed');

      const { id: caseIdMonitoring } = await cases.api.createCase({
        title: 'Monitor uptime',
        tags: ['swimlane'],
        description: 'Test.',
        owner: 'observability',
      });
      const { version: caseVersionMonitoring } = await cases.api.createAttachment({
        caseId: caseIdMonitoring,
        params: { comment: 'test comment', type: CommentType.user, owner: 'observability' },
      });
      await cases.api.setStatus(caseIdMonitoring, caseVersionMonitoring, 'in-progress');
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('cases list screenshot', async () => {
      await cases.navigation.navigateToApp('observability/cases', 'cases-all-title');
      await commonScreenshots.takeScreenshot('cases', screenshotDirectories, 1400, 1024);
    });
  });
}
