/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'roleMappings']);
  const testSubjects = getService('testSubjects');

  describe('Alerts Compatibility', function () {
    describe('ECS', () => {
      describe('threat enrichment', () => {
        before(async () => {
          await pageObjects.common.navigateToApp('securitySolution');
          // wait for indexes to be loaded
        });

        it('allows querying of legacy signals by threat.enrichments', async () => {});

        it('allows querying of legacy signals by threat.indicator', async () => {});
      });
    });
  });
};
