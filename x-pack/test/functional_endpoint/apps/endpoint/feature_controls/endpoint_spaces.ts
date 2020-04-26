/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const spacesService = getService('spaces');
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('spaces', () => {
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

      it('shows endpoint navlink', async () => {
        await pageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(link => link.text);
        expect(navLinks).to.contain('Endpoint');
      });

      it(`endpoint app shows 'Hello World'`, async () => {
        await pageObjects.common.navigateToApp('endpoint', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('welcomeTitle');
      });

      it(`endpoint hosts shows hosts lists page`, async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', '/hosts', undefined, {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('hostPage');
      });
    });

    describe('space with endpoint disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['endpoint'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it(`doesn't show endpoint navlink`, async () => {
        await pageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(link => link.text);
        expect(navLinks).not.to.contain('Endpoint');
      });
    });
  });
}
