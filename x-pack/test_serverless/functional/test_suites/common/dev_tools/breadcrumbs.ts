/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'common']);
  const testSubjects = getService('testSubjects');

  describe('Breadcrumbs', function () {
    // The dev tools breadcrumbs are slightly different in the Search project
    this.tags('skipSvlSearch');

    before(async () => {
      await pageObjects.svlCommonPage.login();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('Sets the right breadcrumb when navigating to dev tools', async () => {
      await pageObjects.common.navigateToApp('dev_tools');

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });

    it('Sets the right breadcrumb when navigating to console app', async () => {
      await pageObjects.common.navigateToApp('dev_tools', { hash: '/console' });

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });

    it('Sets the right breadcrumb when navigating to grok debugger app', async () => {
      await pageObjects.common.navigateToApp('dev_tools', { hash: '/grokdebugger' });

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });

    it('Sets the right breadcrumb when navigating to search profiler app', async () => {
      await pageObjects.common.navigateToApp('dev_tools', { hash: '/searchprofiler' });

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });

    it('Sets the right breadcrumb when navigating to painless lab app', async () => {
      await pageObjects.common.navigateToApp('dev_tools', { hash: '/painless_lab' });

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });
  });
}
