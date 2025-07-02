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
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
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
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
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
      await testSubjects.existOrFail('~nav-item-search_project_nav.kibana.discover');
      // dashboard and index_management navigation links are hidden
      await testSubjects.missingOrFail('~nav-item-search_project_nav.kibana.dashboard');
      await testSubjects.missingOrFail(
        'nav-item-search_project_nav.content.management:index_management'
      );
    });

    it('should access Discover app', async () => {
      await pageObjects.common.navigateToApp('discover');
      await pageObjects.timePicker.setDefaultAbsoluteRange();
      await pageObjects.header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
      expect(await testSubjects.exists('discoverQueryHits')).to.be(true);
    });

    it('should access console with API key', async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithCustomRoleScope();
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
