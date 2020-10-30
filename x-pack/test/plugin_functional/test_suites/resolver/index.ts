/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  describe('Resolver test app', function () {
    this.tags('ciGroup7');

    beforeEach(async function () {
      await pageObjects.common.navigateToApp('resolverTest');
    });

    it('renders at least one node, one node-list, one edge line, and graph controls', async function () {
      await testSubjects.existOrFail('resolver:node');
      await testSubjects.existOrFail('resolver:node-list');
      await testSubjects.existOrFail('resolver:graph:edgeline');
      await testSubjects.existOrFail('resolver:graph-controls');
    });
  });
}
