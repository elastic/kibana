/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const rulesHelper = getService('rulesHelper');
  const testSubjects = getService('testSubjects');

  describe('upgrade rules smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    spaces.forEach(({ space, basePath }) => {
      describe('space: ' + space, () => {
        before(async () => {
          await pageObjects.common.navigateToUrl(
            'management',
            'insightsAndAlerting/triggersActions/rules',
            {
              ensureCurrentUrl: false,
              shouldLoginIfPrompted: true,
              shouldUseHashForSubUrl: false,
              basePath,
            }
          );
          await pageObjects.header.waitUntilLoadingHasFinished();
          await testSubjects.click('rulesTab');
        });
        it('shows created rule with no errors', async () => {
          const createdRuleName = 'Upgrade Rule';
          await testSubjects.click('rulesTab');
          await rulesHelper.searchRules('"' + createdRuleName + '"');
          const workAround = process.env.TEST_RULE_WORKAROUND ? true : false;
          if (workAround) {
            await rulesHelper.disableEnableRule();
          }
          const searchResults = await rulesHelper.getRulesList();
          expect(searchResults.length).to.equal(1);
          expect(searchResults[0].name).to.contain(createdRuleName);
          expect(searchResults[0].interval).to.equal('1 min');
          expect(searchResults[0].status).to.equal('Enabled');
          expect(searchResults[0].lastResponse).to.equal('Ok');
        });
      });
    });
  });
}
