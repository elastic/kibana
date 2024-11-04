/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const svlSettingsApi = getService('svlSettingsApi');
  const svlIndicesHelpers = getService('svlIndicesHelpers');
  let roleAuthc: RoleCredentials;

  describe('settings', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await svlIndicesHelpers.deleteAllIndices();
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should fetch an index settings', async () => {
      const index = await svlIndicesHelpers.createIndex();

      const { status, body } = await svlSettingsApi.getIndexSettings(index, roleAuthc);
      svlCommonApi.assertResponseStatusCode(200, status, body);

      const expectedSettings = [
        'lifecycle',
        'merge',
        'mapping',
        'query',
        'sort',
        'codec',
        'default_pipeline',
        'refresh_interval',
        'blocks',
        'query_string',
      ];

      // Make sure none of the settings have been removed from ES API
      expectedSettings.forEach((setting) => {
        try {
          expect(Object.hasOwn(body.defaults.index, setting)).to.eql(true);
        } catch {
          throw new Error(`Expected setting "${setting}" not found.`);
        }
      });
    });

    it('should update an index settings', async () => {
      const index = await svlIndicesHelpers.createIndex();

      const { body: body1 } = await svlSettingsApi.getIndexSettings(index, roleAuthc);

      // There are no settings by default
      expect(body1.settings?.index?.number_of_replicas).to.be(undefined);

      const settings = {
        index: {
          refresh_interval: '7s',
        },
      };
      await svlSettingsApi.updateIndexSettings(index, settings, roleAuthc);

      const { body: body2 } = await svlSettingsApi.getIndexSettings(index, roleAuthc);

      expect(body2.settings.index.refresh_interval).to.be('7s');
    });
  });
}
