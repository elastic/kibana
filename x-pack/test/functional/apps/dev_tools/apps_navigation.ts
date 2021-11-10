/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  describe('Apps navigation', () => {
    before(async () => {
      await security.testUser.setRoles(['global_devtools_read']);
      await PageObjects.common.navigateToApp('searchProfiler');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Navigates to console app', async () => {
      await PageObjects.common.navigateToApp('dev_tools');

      const firstBreadcrumb = await testSubjects.getVisibleText('breadcrumb first');
      const secondBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(firstBreadcrumb).to.be('Dev Tools');
      expect(secondBreadcrumb).to.be('Console');
    });

    it('Navigates to grok debugger app', async () => {
      await PageObjects.common.navigateToApp('grokDebugger');

      const firstBreadcrumb = await testSubjects.getVisibleText('breadcrumb first');
      const secondBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(firstBreadcrumb).to.be('Dev Tools');
      expect(secondBreadcrumb).to.be('Grok Debugger');
    });

    it('Navigates to search profiler app', async () => {
      await PageObjects.common.navigateToApp('searchProfiler');

      const firstBreadcrumb = await testSubjects.getVisibleText('breadcrumb first');
      const secondBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(firstBreadcrumb).to.be('Dev Tools');
      expect(secondBreadcrumb).to.be('Search Profiler');
    });

    it('Navigates to painless lab app', async () => {
      await PageObjects.common.navigateToApp('painlessLab');

      const firstBreadcrumb = await testSubjects.getVisibleText('breadcrumb first');
      const secondBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(firstBreadcrumb).to.be('Dev Tools');
      expect(secondBreadcrumb).to.be('Painless Lab');
    });
  });
}
