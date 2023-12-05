/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  describe('Breadcrumbs', function () {
    // The dev tools breadcrumbs are slightly different in the Search project
    this.tags('skipSvlSearch');

    before(async () => {
      await security.testUser.setRoles(['global_devtools_read']);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Sets the right breadcrumb when navigating to dev tools', async () => {
      await PageObjects.common.navigateToApp('dev_tools');

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });

    it('Sets the right breadcrumb when navigating to console app', async () => {
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/console' });

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });

    it('Sets the right breadcrumb when navigating to grok debugger app', async () => {
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/grokDebugger' });

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });

    it('Sets the right breadcrumb when navigating to search profiler app', async () => {
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/searchProfiler' });

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });

    it('Sets the right breadcrumb when navigating to painless lab app', async () => {
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/painlessLab' });

      const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
        'breadcrumb breadcrumb-deepLinkId-dev_tools last'
      );
      expect(lastBreadcrumbdcrumb).to.be('Developer tools');
    });
  });
}
