/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  // See: https://github.com/elastic/kibana/issues/81397
  describe.skip('GlobalSearchBar', function () {
    const { common } = getPageObjects(['common']);
    const find = getService('find');
    const testSubjects = getService('testSubjects');
    const browser = getService('browser');

    before(async () => {
      await common.navigateToApp('home');
    });

    it('basically works', async () => {
      const field = await testSubjects.find('header-search');
      await field.click();

      expect((await testSubjects.findAll('header-search-option')).length).to.be(15);

      field.type('d');

      const options = await testSubjects.findAll('header-search-option');

      expect(options.length).to.be(6);

      await options[1].click();

      expect(await browser.getCurrentUrl()).to.contain('discover');
      expect(await (await find.activeElement()).getTagName()).to.be('body');
    });
  });
}
