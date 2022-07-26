/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'fleet']);
  const a11y = getService('a11y');

  describe('Home page', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('fleet');
    });

    describe('Agents', async () => {
      describe('Quick Start', async () => {
        await a11y.testAppSnapshot();
      });
    });

    it('Loads the app', async () => {});

    describe('Repositories Tab', async () => {
      before(async () => {});

      it('cleanup repository', async () => {});
      after(async () => {});
    });
  });
};
