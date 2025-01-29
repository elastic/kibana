/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getService('svlCommonNavigation');

  describe('home page', function () {
    before(async () => {
      await svlCommonPage.loginAsViewer();
    });

    it('has project header', async () => {
      await svlCommonNavigation.navigateToKibanaHome();
      await svlCommonPage.assertProjectHeaderExists();
    });
  });
}
