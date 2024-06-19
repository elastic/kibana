/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  describe('Global Search Bar', function () {
    const PageObjects = getPageObjects([
      'navigationalSearch',
      'security',
      'common',
      'spaceSelector',
    ]);
    const kibanaServer = getService('kibanaServer');
    const security = getService('security');
    const spaces = getService('spaces');
    const retry = getService('retry');

    describe('With spaces', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await spaces.delete('limited');

        await spaces.create({ id: 'limited', name: 'Limited Space' });
        await security.role.create('global_search_limited_space_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                advancedSettings: ['all'],
                globalSettings: ['all'],
              },
              spaces: ['limited'],
            },
          ],
        });
        await security.user.create('global_search_limited_space_user', {
          password: 'global_search_read_url_create_user-password',
          roles: ['global_search_limited_space_role'],
          full_name: 'test user',
        });

        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/global_search/search_syntax'
        );
        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'global_search_limited_space_user',
          'global_search_read_url_create_user-password'
        );
      });
      after(async () => {
        await security.role.delete('global_search_limited_space_role');
        await security.user.delete('global_search_limited_space_user');
        await spaces.delete('limited');
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('results displayed should be filtered by spaces', async () => {
        await retry.try(async () => {
          await PageObjects.navigationalSearch.searchFor('type:dashboard', { wait: true });
          expect(await PageObjects.navigationalSearch.isNoResultsPlaceholderDisplayed(1000)).to.eql(
            true
          );
        });
      });
    });
    describe('With security', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/global_search/search_syntax'
        );

        await security.role.create('global_search_limited_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                advancedSettings: ['read'],
                globalSettings: ['show'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create('global_search_limited_user', {
          password: 'global_search_read_url_create_user-password',
          roles: ['global_search_limited_role'],
          full_name: 'test user',
        });
        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'global_search_limited_user',
          'global_search_read_url_create_user-password'
        );
      });

      after(async () => {
        await security.role.delete('global_search_limited_role');
        await security.user.delete('global_search_limited_user');
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('results displayed should be filtered by the user permissions', async () => {
        await retry.try(async () => {
          await PageObjects.navigationalSearch.searchFor('type:dashboard', { wait: true });
          expect(await PageObjects.navigationalSearch.isNoResultsPlaceholderDisplayed(1000)).to.eql(
            true
          );
        });
      });
    });
  });
}
