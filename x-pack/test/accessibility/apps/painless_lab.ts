/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'security']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const a11y = getService('a11y');

  describe('Accessibility Painless Lab Editor', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('painlessLab');
    });

    it('renders the page without a11y errors', async () => {
      await PageObjects.common.navigateToApp('painlessLab');
      await a11y.testAppSnapshot();
    });

    it('click on the output button', async () => {
      const painlessTabsOutput = await find.byCssSelector(
        '[data-test-subj="painlessTabs"] #output'
      );
      await painlessTabsOutput.click();
      await a11y.testAppSnapshot();
    });

    it('click on the parameters button', async () => {
      const painlessTabsParameters = await find.byCssSelector(
        '[data-test-subj="painlessTabs"] #parameters'
      );
      await painlessTabsParameters.click();
      await a11y.testAppSnapshot();
    });

    // github.com/elastic/kibana/issues/75876
    it.skip('click on the context button', async () => {
      const painlessTabsContext = await find.byCssSelector(
        '[data-test-subj="painlessTabs"] #context'
      );
      await painlessTabsContext.click();
      await a11y.testAppSnapshot();
    });

    it.skip('click on the Basic button', async () => {
      await testSubjects.click('basicButtonDropdown');
      await a11y.testAppSnapshot();
    });

    it.skip('click on the Filter button', async () => {
      await testSubjects.click('filterButtonDropdown');
      await a11y.testAppSnapshot();
    });

    it.skip('click on the Score button', async () => {
      await testSubjects.click('scoreButtonDropdown');
      await a11y.testAppSnapshot();
    });
  });
}
