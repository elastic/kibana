/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const find = getService('find');
  const cases = getService('cases');
  const testSubjects = getService('testSubjects');

  describe('Configure', function () {
    before(async () => {
      await cases.navigation.navigateToConfigurationPage();
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('changes the closure option correctly', async () => {});
  });
};
