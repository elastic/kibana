/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'searchSynonyms',
    'embeddedConsole',
    'common',
  ]);
  const browser = getService('browser');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('Serverless Synonyms Set Detail', function () {
    before(async () => {
      await kibanaServer.uiSettings.update({ 'searchSynonyms:synonymsEnabled': 'true' });
      await pageObjects.svlCommonPage.loginWithRole('developer');
    });

    describe('Synonyms Set Detail Page', () => {
      before(async () => {
        await es.transport.request({
          path: '_synonyms/test-synonym-details',
          method: 'PUT',
          body: {
            synonyms_set: [
              {
                id: 'rule1',
                synonyms: 'a,b,c',
              },
              {
                id: 'rule2',
                synonyms: 'd,e => f',
              },
            ],
          },
        });
      });

      it('loads successfully with rules', async () => {
        await pageObjects.common.navigateToApp('elasticsearch/synonyms/sets/test-synonym-details');

        await pageObjects.searchSynonyms.SynonymsSetDetailPage.expectSynonymsSetDetailPageNavigated(
          'test-synonym-details'
        );
        // get the rules
        const rules = await pageObjects.searchSynonyms.SynonymsSetDetailPage.getSynonymsRules();
        expect(rules).to.eql([{ synonyms: 'a,b,c' }, { synonyms: 'd,e => f' }]);
      });

      it('adds and deletes new equivalent rule', async () => {
        await pageObjects.common.navigateToApp('elasticsearch/synonyms/sets/test-synonym-details');

        await pageObjects.searchSynonyms.SynonymsSetDetailPage.clickCreateRuleButton();
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.clickEquivalentRule();
        await pageObjects.searchSynonyms.SynonymRuleFlyout.addFromSynonym('synonym1');
        await pageObjects.searchSynonyms.SynonymRuleFlyout.addFromSynonym('synonym2');
        await pageObjects.searchSynonyms.SynonymRuleFlyout.clickSaveButton();

        await browser.refresh();

        const rules = await pageObjects.searchSynonyms.SynonymsSetDetailPage.getSynonymsRules();
        expect(rules).to.eql([
          { synonyms: 'synonym1,synonym2' },
          { synonyms: 'a,b,c' },
          { synonyms: 'd,e => f' },
        ]);

        // Delete new rule
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.deleteRule(0);

        await browser.refresh();
        const updatedRules =
          await pageObjects.searchSynonyms.SynonymsSetDetailPage.getSynonymsRules();
        expect(updatedRules).to.eql([{ synonyms: 'a,b,c' }, { synonyms: 'd,e => f' }]);
      });

      it('adds and deletes new explicit rule', async () => {
        await pageObjects.common.navigateToApp('elasticsearch/synonyms/sets/test-synonym-details');
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.clickCreateRuleButton();
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.clickExplicitRule();
        await pageObjects.searchSynonyms.SynonymRuleFlyout.addFromSynonym('synonym1');
        await pageObjects.searchSynonyms.SynonymRuleFlyout.addFromSynonym('synonym2');
        await pageObjects.searchSynonyms.SynonymRuleFlyout.addMapTo('synonym3');
        await pageObjects.searchSynonyms.SynonymRuleFlyout.clickSaveButton();
        await browser.refresh();

        const rules = await pageObjects.searchSynonyms.SynonymsSetDetailPage.getSynonymsRules();
        expect(rules).to.eql([
          { synonyms: 'synonym1,synonym2 => synonym3' },
          { synonyms: 'a,b,c' },
          { synonyms: 'd,e => f' },
        ]);
        // delete the new rule
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.deleteRule(0);
        await browser.refresh();
        const updatedRules =
          await pageObjects.searchSynonyms.SynonymsSetDetailPage.getSynonymsRules();
        expect(updatedRules).to.eql([{ synonyms: 'a,b,c' }, { synonyms: 'd,e => f' }]);
      });

      it('edits an existing rule', async () => {
        await pageObjects.common.navigateToApp('elasticsearch/synonyms/sets/test-synonym-details');
        // edit the first rule
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.editRule(0);
        await pageObjects.searchSynonyms.SynonymRuleFlyout.removeSynonym(0);
        await pageObjects.searchSynonyms.SynonymRuleFlyout.addFromSynonym('synonym3');
        await pageObjects.searchSynonyms.SynonymRuleFlyout.clickSaveButton();
        await browser.refresh();
        const rules = await pageObjects.searchSynonyms.SynonymsSetDetailPage.getSynonymsRules();
        expect(rules).to.eql([{ synonyms: 'b,c,synonym3' }, { synonyms: 'd,e => f' }]);
      });

      after(async () => {
        await es.transport.request({
          path: '_synonyms/test-synonym-details',
          method: 'DELETE',
        });
      });
    });
  });
}
