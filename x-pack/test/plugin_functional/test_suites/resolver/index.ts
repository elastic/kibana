/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  // endpoint was not released in 7.8 so disabling all the tests
  describe.skip('Resolver embeddable test app', function () {
    this.tags('ciGroup7');

    beforeEach(async function () {
      await pageObjects.common.navigateToApp('resolverTest');
    });

    it('renders a container div for the embeddable', async function () {
      await testSubjects.existOrFail('resolverEmbeddableContainer');
    });
    it('renders resolver', async function () {
      await testSubjects.existOrFail('resolverEmbeddable');
    });
  });
}
