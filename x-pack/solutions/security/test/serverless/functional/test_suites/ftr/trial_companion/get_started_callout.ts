/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  // The accordion only renders once open milestones exist. Those are produced by a
  // background task on a 1-minute interval, so seed the milestone saved object up front
  // instead of racing the task.
  const NBA_MILESTONE_SO_TYPE = 'trial-companion-nba-milestone';

  describe('Trial Companion', () => {
    before(async () => {
      await svlCommonPage.loginAsAdmin();
      await kibanaServer.savedObjects.create({
        type: NBA_MILESTONE_SO_TYPE,
        overwrite: true,
        attributes: { openTODOs: [1] }, // Milestone.M1
      });
    });
    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [NBA_MILESTONE_SO_TYPE] });
    });
    it('should show on Get Started for an Admin user', async () => {
      await common.navigateToApp('security', { path: 'get_started' });
      await testSubjects.existOrFail('securitySolutionYourTrialCompanion-get-set-up-accordion');
    });
  });
};
