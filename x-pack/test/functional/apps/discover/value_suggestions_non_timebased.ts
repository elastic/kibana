/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['common', 'settings', 'context', 'header']);

  describe('value suggestions non time based', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
      );
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
      );
      await kibanaServer.uiSettings.replace({ defaultIndex: 'without-timefield' });
      await kibanaServer.uiSettings.update({
        'doc_table:legacy': true,
      });
    });

    after(async () => {
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
      );
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.uiSettings.unset('defaultIndex');
      await kibanaServer.uiSettings.unset('doc_table:legacy');
    });

    it('shows all autosuggest options for a filter in discover context app', async () => {
      await PageObjects.common.navigateToApp('discover');
      await queryBar.setQuery('type.keyword : ');
      await queryBar.expectSuggestions({ count: 1, contains: '"apache"' });
    });
  });
}
