/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const docTable = getService('docTable');
  const PageObjects = getPageObjects(['common', 'settings', 'context']);

  describe('value suggestions non time based', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
    });

    it('shows all autosuggest options for a filter in discover context app', async () => {
      await PageObjects.common.navigateToApp('discover');

      // navigate to context
      await docTable.clickRowToggle({ rowIndex: 0 });
      const rowActions = await docTable.getRowActions({ rowIndex: 0 });
      await rowActions[0].click();
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      // Apply filter in context view
      await filterBar.addFilter('baz.keyword', 'is', 'hello');
    });
  });
}
