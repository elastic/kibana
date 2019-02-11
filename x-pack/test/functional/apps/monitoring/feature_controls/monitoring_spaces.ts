/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { SpacesService } from 'x-pack/test/common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// tslint:disable:no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const spacesService: SpacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'dashboard', 'security', 'spaceSelector']);
  const appsMenu = getService('appsMenu');
  const find = getService('find');

  describe('spaces', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
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

      it('shows stack monitoring navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Stack Monitoring');
      });

      it(`can navigate to app`, async () => {
        await PageObjects.common.navigateToApp('monitoring', {
          basePath: '/s/custom_space',
        });

        const exists = await find.existsByCssSelector('monitoring-main');
        expect(exists).to.be(true);
      });
    });

    describe('space with monitoring disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['monitoring'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it(`doesn't show stack monitoring navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('Stack Monitoring');
      });

      it(`navigating to app returns a 404`, async () => {
        await PageObjects.common.navigateToUrl('monitoring', '', {
          basePath: '/s/custom_space',
          shouldLoginIfPrompted: false,
          ensureCurrentUrl: false,
        });

        const messageText = await PageObjects.common.getBodyText();
        expect(messageText).to.eql(
          JSON.stringify({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          })
        );
      });
    });
  });
}
