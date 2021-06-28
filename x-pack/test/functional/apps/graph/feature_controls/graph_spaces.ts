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
  const PageObjects = getPageObjects(['common', 'graph', 'security', 'error']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('spaces', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
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
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Graph');
      });

      it('landing page shows "Create new graph" button', async () => {
        await PageObjects.common.navigateToApp('graph', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('graphLandingPage', { timeout: 10000 });
        await testSubjects.existOrFail('graphCreateGraphPromptButton');
      });

      it('allows creating a new graph', async () => {
        await PageObjects.common.navigateToApp('graph', {
          basePath: '/s/custom_space',
        });
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
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Graph');
      });

      it(`navigating to app shows 404`, async () => {
        await PageObjects.common.navigateToUrl('graph', '', {
          basePath: '/s/custom_space',
          shouldLoginIfPrompted: false,
          ensureCurrentUrl: false,
        });
        await PageObjects.error.expectNotFound();
      });
    });
  });
}
