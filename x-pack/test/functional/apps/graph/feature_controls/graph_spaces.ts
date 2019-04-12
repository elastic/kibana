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
  const esArchiver = getService('esArchiver');
  const spacesService: SpacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'graph', 'security', 'error']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

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

      it('shows graph navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Graph');
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToApp('graph', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('graphSaveButton');
      });

      it('shows delete button', async () => {
        await PageObjects.common.navigateToApp('graph', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('graphDeleteButton');
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
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
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
