/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const es = getService('legacyEs');

  describe('uptime', () => {
    before(
      async () =>
        await es.indices.delete({
          index: 'heartbeat*',
          ignore: [404],
        })
    );

    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./get_all_pings'));
    loadTestFile(require.resolve('./rest'));
  });
}
