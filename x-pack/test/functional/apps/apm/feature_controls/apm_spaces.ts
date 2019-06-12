/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SpacesService } from '../../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const spacesService: SpacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'error', 'timePicker', 'security']);
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

      it('shows apm navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('APM');
      });

      it('can navigate to Uptime app', async () => {
        await PageObjects.common.navigateToApp('apm');
        await testSubjects.existOrFail('apmMainContainer', 10000);
      });
    });

    describe('space with Uptime disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['apm'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it(`doesn't show apm navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('APM');
      });

      it(`renders not found page`, async () => {
        await PageObjects.common.navigateToUrl('apm', '', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.error.expectNotFound();
      });
    });
  });
}
