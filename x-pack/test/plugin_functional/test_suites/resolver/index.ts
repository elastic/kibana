/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({
  getPageObjects,
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const screenshot = getService('screenshots');

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
      const nodeElement = await testSubjects.find('resolver:node');

      // nodes: short name origin node with 13 pills, long name non-origin node, short name non-origin node
      // node states: node is selected, node is unselected
      // interaction states: node button is hovered, node button is focused, node button is hovered and focused, pill is focused, pill is hovered, pill is hovered and focused

      await screenshot.compareAgainstBaseline('resolver_test_plugin', updateBaselines, nodeElement);
    });
  });
}
