/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'home', 'graph']);

  describe('upgrade graph smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    const graphTests = [
      { name: 'flights', numNodes: 91 },
      { name: 'logs', numNodes: 27 },
      { name: 'ecommerce', numNodes: 12 },
    ];

    spaces.forEach(({ space, basePath }) => {
      graphTests.forEach(({ name, numNodes }) => {
        describe('space: ' + space, () => {
          before(async () => {
            await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
              basePath,
            });
            await PageObjects.header.waitUntilLoadingHasFinished();
            await PageObjects.home.launchSampleGraph(name);
            await PageObjects.header.waitUntilLoadingHasFinished();
          });
          it('renders graph for ' + name, async () => {
            const elements = await PageObjects.graph.getAllGraphNodes();
            expect(elements).to.be.equal(numNodes);
          });
        });
      });
    });
  });
}
