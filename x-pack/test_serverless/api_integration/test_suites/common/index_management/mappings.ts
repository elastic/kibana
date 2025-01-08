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
  const log = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  const svlMappingsApi = getService('svlMappingsApi');
  const svlIndicesHelpers = getService('svlIndicesHelpers');

  describe('mappings', () => {
    let indexName: string;

    const mappings = {
      properties: {
        total: { type: 'long' },
        tag: { type: 'keyword' },
        createdAt: { type: 'date' },
      },
    };

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      log.debug('Creating index');
      try {
        indexName = await svlIndicesHelpers.createIndex(undefined, mappings);
      } catch (err) {
        log.debug('[Setup error] Error creating index');
        throw err;
      }
    });

    after(async () => {
      try {
        await svlIndicesHelpers.deleteAllIndices();
      } catch (err) {
        log.debug('[Cleanup error] Error deleting index');
        throw err;
      }
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should get the index mappings', async () => {
      const { body, status } = await svlMappingsApi.getMapping(indexName, roleAuthc);
      svlCommonApi.assertResponseStatusCode(200, status, body);

      expect(body.mappings).to.eql(mappings);
    });
  });
}
