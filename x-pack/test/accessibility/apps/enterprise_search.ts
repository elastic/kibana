/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const esArchiver = getService('esArchiver');
  const { common } = getPageObjects(['common']);

  describe('Enterprise Search', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    describe('Overview', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/overview');
      });

      it('loads a landing page with product cards', async function () {
        await a11y.testAppSnapshot();
      });
    });
  });
}
