/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const spacesService = getService('spaces');
  const { common, header, error } = getPageObjects(['common', 'error', 'header']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('spaces', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
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

      it('shows graph navlink', async () => {
        await common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        await header.waitUntilLoadingHasFinished();
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Graph');
      });

      it('landing page shows "Create new graph" button', async () => {
        await common.navigateToApp('graph', {
          basePath: '/s/custom_space',
        });
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('graphLandingPage', { timeout: 10000 });
        await testSubjects.existOrFail('graphCreateGraphPromptButton');
      });

      it('allows creating a new graph', async () => {
        await common.navigateToApp('graph', {
          basePath: '/s/custom_space',
        });
        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('graphCreateGraphPromptButton');
        const breadcrumb = await testSubjects.find('~graphCurrentGraphBreadcrumb');
        expect(await breadcrumb.getVisibleText()).to.equal('Unsaved graph');
      });
    });

    describe('space with Graph disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['graph'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it(`doesn't show graph navlink`, async () => {
        await common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        await header.waitUntilLoadingHasFinished();
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Graph');
      });

      it(`navigating to app shows 404`, async () => {
        await common.navigateToUrl('graph', '', {
          basePath: '/s/custom_space',
          shouldLoginIfPrompted: false,
          ensureCurrentUrl: false,
        });
        await error.expectNotFound();
      });
    });
  });
}
