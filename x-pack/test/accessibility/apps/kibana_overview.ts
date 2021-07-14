/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'home']);
  const a11y = getService('a11y');

  describe('Kibana overview', () => {
    const esArchiver = getService('esArchiver');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await PageObjects.common.navigateToApp('kibanaOverview');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    it('Kibana overview', async () => {
      await a11y.testAppSnapshot();
    });
  });
}
