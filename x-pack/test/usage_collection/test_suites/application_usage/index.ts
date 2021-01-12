/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  describe('Application Usage', function () {
    this.tags('ciGroup1');
    const { common } = getPageObjects(['common']);

    it('successfully loads home (the application_usage_test plugin does not fail)', async () => {
      await common.navigateToApp('home');
    });
  });
}
