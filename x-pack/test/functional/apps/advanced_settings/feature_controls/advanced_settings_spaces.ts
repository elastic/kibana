/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('spaces feature controls', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('empty_kibana');

        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('empty_kibana');
      });

      it('shows Management navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Management');
      });

      it(`allows settings to be changed`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', 'management/kibana/settings', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'America/Phoenix');
        const advancedSetting = await PageObjects.settings.getAdvancedSettings('dateFormat:tz');
        expect(advancedSetting).to.be('America/Phoenix');
      });
    });

    describe('space with Advanced Settings disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('empty_kibana');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['advancedSettings'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('empty_kibana');
      });

      it(`redirects to Kibana home`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', 'management/kibana/settings', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', {
          timeout: 10000,
        });
      });
    });
  });
}
