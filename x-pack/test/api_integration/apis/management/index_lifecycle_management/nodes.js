/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { registerHelpers } from './nodes.helpers';
import { NODE_CUSTOM_ATTRIBUTE } from './constants';
import { initElasticsearchHelpers } from './lib';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const es = getService('es');

  const { getNodesStats } = initElasticsearchHelpers(es);
  const { loadNodes, getNodeDetails } = registerHelpers({ supertest });

  describe('nodes', function () {
    // Cloud disallows setting custom node attributes, so we can't use `NODE_CUSTOM_ATTRIBUTE`
    // to retrieve the IDs we expect.
    this.tags(['skipCloud']);

    describe('list', () => {
      it('should return the list of ES node for each custom attributes', async () => {
        const nodeStats = await getNodesStats();
        const nodesIds = Object.keys(nodeStats.nodes);

        const { body } = await loadNodes().expect(200);
        expect(body[NODE_CUSTOM_ATTRIBUTE]).to.eql(nodesIds);
      });
    });

    describe('detail', async () => {
      it('should return the node stats when providing a custom node attribute', async () => {
        // Load the stats from ES js client
        const nodeStats = await getNodesStats();
        const nodesIds = Object.keys(nodeStats.nodes);
        const [nodeId] = nodesIds;

        // Compare it with our node details endpoint
        const { body } = await getNodeDetails(NODE_CUSTOM_ATTRIBUTE);
        expect(body[0].nodeId).to.equal(nodeId);
      });
    });
  });
}
