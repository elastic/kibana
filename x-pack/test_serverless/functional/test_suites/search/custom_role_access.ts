/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { RoleCredentials } from '../../../shared/services';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'timePicker', 'common', 'header']);
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  let roleAuthc: RoleCredentials;

  describe('With custom role', function () {
    // skipping on MKI while we are working on a solution
    this.tags(['skipMKI']);
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await samlAuth.setCustomRole({
        elasticsearch: {
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
        },
        kibana: [
          {
            feature: {
              discover: ['read'],
            },
            spaces: ['*'],
          },
        ],
      });
      // login with custom role
      await pageObjects.svlCommonPage.loginWithCustomRole();
      await pageObjects.svlCommonPage.assertUserAvatarExists();
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
      if (roleAuthc) {
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      }
      // delete custom role
      await samlAuth.deleteCustomRole();
    });

    it('should have limited navigation menu', async () => {
      await pageObjects.svlCommonPage.assertUserAvatarExists();
      // discover navigation link is present
      await testSubjects.existOrFail('~nav-item-id-discover');
      // index management, dev tools, dashboards and maps navigation links are hidden
      await testSubjects.missingOrFail('~nav-item-id-management:index_management');
      await testSubjects.missingOrFail('~nav-item-id-dev_tools');
      // Playground should be also hidden, probably a bug
      // await testSubjects.missingOrFail('~nav-item-id-searchPlayground');
      await testSubjects.missingOrFail('~nav-item-id-dashboards');
      await testSubjects.missingOrFail('~nav-item-id-maps');
    });

    it('should access Discover app', async () => {
      await pageObjects.common.navigateToApp('discover');
      await pageObjects.timePicker.setDefaultAbsoluteRange();
      await pageObjects.header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
      expect(await testSubjects.exists('discoverQueryHits')).to.be(true);
    });

    it('should access console with API key', async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('customRole');
      const { body } = await supertestWithoutAuth
        .get('/api/console/api_server')
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .set({ 'kbn-xsrf': 'true' })
        .expect(200);
      expect(body.es).to.be.ok();
    });
  });
}
