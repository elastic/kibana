/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'common']);
  const testSubjects = getService('testSubjects');

  describe('Dev Tools', () => {
    before(async () => {
      await pageObjects.svlCommonPage.login();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('Breadcrumbs', () => {
      it('Sets the right breadcrumb when navigating to dev tools', async () => {
        await pageObjects.common.navigateToApp('dev_tools');

        const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
          'breadcrumb breadcrumb-deepLinkId-dev_tools:console last'
        );
        expect(lastBreadcrumbdcrumb).to.be('Dev Tools');
      });

      it('Sets the right breadcrumb when navigating to console app', async () => {
        await pageObjects.common.navigateToApp('dev_tools', { hash: '/console' });

        const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
          'breadcrumb breadcrumb-deepLinkId-dev_tools:console last'
        );
        expect(lastBreadcrumbdcrumb).to.be('Dev Tools');
      });

      it('Sets the right breadcrumb when navigating to search profiler app', async () => {
        await pageObjects.common.navigateToApp('dev_tools', { hash: '/searchprofiler' });

        const lastBreadcrumbdcrumb = await testSubjects.getVisibleText(
          'breadcrumb breadcrumb-deepLinkId-dev_tools:console last'
        );
        expect(lastBreadcrumbdcrumb).to.be('Dev Tools');
      });
    });
  });
}
