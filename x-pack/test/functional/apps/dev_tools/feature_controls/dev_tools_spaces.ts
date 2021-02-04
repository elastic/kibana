/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'dashboard', 'security', 'spaceSelector', 'error']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const grokDebugger = getService('grokDebugger');

  describe('spaces', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it(`shows 'Dev Tools' navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Dev Tools');
      });

      it(`can navigate to console`, async () => {
        await PageObjects.common.navigateToApp('console');
        await testSubjects.existOrFail('console');
      });

      it(`can navigate to search profiler`, async () => {
        await PageObjects.common.navigateToApp('searchProfiler');
        await testSubjects.existOrFail('searchprofiler');
      });

      it(`can navigate to grok debugger`, async () => {
        await PageObjects.common.navigateToApp('grokDebugger');
        await grokDebugger.assertExists();
      });
    });

    describe('space with dev_tools disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['dev_tools'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it(`doesn't show 'Dev Tools' navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Dev Tools');
      });

      it(`navigating to console shows 404`, async () => {
        await PageObjects.common.navigateToUrl('console', '', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          useActualUrl: true,
        });
        await PageObjects.error.expectNotFound();
      });

      it(`navigating to search profiler shows 404`, async () => {
        await PageObjects.common.navigateToUrl('searchProfiler', '', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          useActualUrl: true,
        });
      });

      it(`navigating to grok debugger shows 404`, async () => {
        await PageObjects.common.navigateToUrl('grokDebugger', '', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          useActualUrl: true,
        });
        await PageObjects.error.expectNotFound();
      });
    });
  });
}
