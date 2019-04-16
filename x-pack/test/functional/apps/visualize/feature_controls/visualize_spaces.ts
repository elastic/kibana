/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
// eslint-disable-next-line max-len
import { VisualizeConstants } from '../../../../../../src/legacy/core_plugins/kibana/public/visualize/visualize_constants';
import { SpacesService } from '../../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const spacesService: SpacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'visualize', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('visualize', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('visualize/default');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('visualize/default');
      });

      it('shows visualize navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Visualize');
      });

      it(`can view existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          `${VisualizeConstants.EDIT_PATH}/i-exist`,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('visualizationLoader', 10000);
      });
    });

    describe('space with Visualize disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('visualize/default');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['visualize'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('visualize/default');
      });

      it(`doesn't show visualize navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('Visualize');
      });

      it(`create new visualization redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', VisualizeConstants.CREATE_PATH, {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`edit visualization for object which doesn't exist redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          `${VisualizeConstants.EDIT_PATH}/i-dont-exist`,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`edit visualization for object which exists redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          `${VisualizeConstants.EDIT_PATH}/i-exist`,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('homeApp', 10000);
      });
    });
  });
}
