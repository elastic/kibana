/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function searchFunctonalTests({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);

  describe('Search', function() {
    this.tags('smoke');
    const symbolTypeaheadListSelector = 'codeTypeaheadList-symbol codeTypeaheadItem';
    const fileTypeaheadListSelector = 'codeTypeaheadList-file codeTypeaheadItem';
    const searchResultListSelector = 'codeSearchResultList codeSearchResultFileItem';
    const languageFilterListSelector = 'codeSearchLanguageFilterList codeSearchLanguageFilterItem';

    describe('Code Search', () => {
      before(async () => {
        await esArchiver.load('code/repositories/typescript_node_starter');

        // Navigate to the search page of the code app.
        await PageObjects.common.navigateToApp('codeSearch');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await PageObjects.security.logout();
        await esArchiver.unload('code/repositories/typescript_node_starter');
      });

      it('Trigger symbols in typeahead', async () => {
        log.debug('Trigger symbols in typeahead');
        await PageObjects.code.fillSearchQuery('user');

        await retry.tryForTime(5000, async () => {
          const symbols = await testSubjects.findAll(symbolTypeaheadListSelector);
          expect(symbols).to.have.length(5);

          expect(await symbols[0].getVisibleText()).to.equal('User.findOne() callback.user');
          expect(await symbols[1].getVisibleText()).to.equal('postSignup.user');
        });
      });

      it('File typeahead should be case insensitive', async () => {
        log.debug('File typeahead should be case insensitive');
        await PageObjects.code.fillSearchQuery('LICENSE');

        await retry.tryForTime(5000, async () => {
          const symbols = await testSubjects.findAll(fileTypeaheadListSelector);
          expect(symbols).to.have.length(1);

          expect(await symbols[0].getVisibleText()).to.equal('LICENSE');
        });

        await PageObjects.code.fillSearchQuery('license');

        await retry.tryForTime(5000, async () => {
          const symbols = await testSubjects.findAll(fileTypeaheadListSelector);
          expect(symbols).to.have.length(1);

          expect(await symbols[0].getVisibleText()).to.equal('LICENSE');
        });
      });

      it('Full text search', async () => {
        log.debug('Full text search');
        // Fill in the search query bar with a common prefix of symbols.
        await PageObjects.code.fillSearchQuery('user');
        await PageObjects.code.submitSearchQuery();

        await retry.tryForTime(5000, async () => {
          const results = await testSubjects.findAll(searchResultListSelector);
          expect(results).to.have.length(20);

          // The third file has the most matches of the query, but is still ranked as
          // the thrid because the the query matches the qname of the first 2 files. This
          // is because qname got boosted more from search.
          expect(await results[0].getVisibleText()).to.equal('src/controllers/user.ts');
          expect(await results[1].getVisibleText()).to.equal('src/models/User.ts');
          expect(await results[2].getVisibleText()).to.equal('src/config/passport.ts');
        });
      });

      it('Full text search with complex query terms', async () => {
        log.debug('Full text search with complex query terms');
        // Fill in the search query bar with a complex query which could result in multiple
        // terms.
        await PageObjects.code.fillSearchQuery('postUpdateProfile');
        await PageObjects.code.submitSearchQuery();

        await retry.tryForTime(5000, async () => {
          const results = await testSubjects.findAll(searchResultListSelector);
          expect(results).to.have.length(2);
          expect(await results[0].getVisibleText()).to.equal('src/app.ts');
          expect(await results[1].getVisibleText()).to.equal('src/controllers/user.ts');
        });
      });

      it('Apply language filter', async () => {
        log.debug('Apply language filter');
        // Fill in the search query bar with a common prefix of symbols.
        await PageObjects.code.fillSearchQuery('user');
        await PageObjects.code.submitSearchQuery();

        await retry.tryForTime(5000, async () => {
          const langFilters = await testSubjects.findAll(languageFilterListSelector);
          expect(langFilters).to.have.length(4);

          expect(await langFilters[0].getVisibleText()).to.equal('scss\n9');
          expect(await langFilters[1].getVisibleText()).to.equal('typescript\n7');
          expect(await langFilters[2].getVisibleText()).to.equal('pug\n5');
          expect(await langFilters[3].getVisibleText()).to.equal('markdown\n1');
        });

        await retry.tryForTime(5000, async () => {
          // click the first language filter item.
          await testSubjects.click(languageFilterListSelector);

          const results = await testSubjects.findAll(searchResultListSelector);
          expect(results).to.have.length(9);

          expect(await results[0].getVisibleText()).to.equal(
            'src/public/css/lib/bootstrap/mixins/_vendor-prefixes.scss'
          );
          expect(await results[1].getVisibleText()).to.equal(
            'src/public/css/themes/gsdk/gsdk/mixins/_vendor-prefixes.scss'
          );
        });
      });
    });
  });
}
