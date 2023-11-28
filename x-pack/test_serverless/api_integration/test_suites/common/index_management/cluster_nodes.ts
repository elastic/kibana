/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const indexManagementService = getService('indexManagement');

  describe('nodes', () => {
    let getNodesPlugins: typeof indexManagementService['clusterNodes']['api']['getNodesPlugins'];

    before(async () => {
      ({
        clusterNodes: {
          api: { getNodesPlugins },
        },
      } = indexManagementService);
    });

    it('should fetch the nodes plugins', async () => {
      const { body } = await getNodesPlugins().expect(200);

      expect(Array.isArray(body)).to.be(true);
    });
  });
}
