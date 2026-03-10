/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'cisAddIntegration', 'header']);

  describe('Agentless CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let testSubjectIds: typeof pageObjects.cisAddIntegration.testSubjectIds;

    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
      cisIntegration = pageObjects.cisAddIntegration;
      testSubjectIds = pageObjects.cisAddIntegration.testSubjectIds;
    });

    describe.skip('Serverless - Agentless CIS_GCP edit flow', () => {
      it(`user should save and edit agentless integration policy`, async () => {
        const newCredentialsJSON = 'newJson';
        await cisIntegration.createAgentlessIntegration({
          cloudProvider: 'gcp',
        });
        await cisIntegration.editAgentlessIntegration(
          testSubjectIds.CREDENTIALS_JSON_TEST_ID,
          newCredentialsJSON
        );

        // assert the form values are saved
        expect(
          await cisIntegration.getFieldAttributeValue(testSubjectIds.PRJ_ID_TEST_ID, 'disabled')
        ).to.be('true');
        expect(
          await cisIntegration.getFieldAttributeValue(
            testSubjectIds.CREDENTIALS_JSON_TEST_ID,
            'value'
          )
        ).to.be(newCredentialsJSON);
      });
    });
  });
}
