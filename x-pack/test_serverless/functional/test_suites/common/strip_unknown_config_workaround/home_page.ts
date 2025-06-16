/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlCommonPage = getPageObject('svlCommonPage');

  describe('can browse Kibana', function () {
    before(async () => {
      await svlCommonPage.loginAsViewer();
    });

    it('has project header', async () => {
      await svlCommonPage.assertProjectHeaderExists();
    });

    // We don't have a logger service to check the logs at this stage.
    // However, it's already tested in the unit tests.
    // it('Kibana logs "Strict config validation failed!"');
  });
}
