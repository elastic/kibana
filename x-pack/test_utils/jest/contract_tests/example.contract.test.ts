/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';

import { createKibanaServer } from './servers';

const { callWhenOnline, memorize } = Slapshot;

let servers: { kbnServer: any; shutdown: () => void };

// FLAKY: https://github.com/elastic/kibana/issues/44250
describe.skip('Example contract tests', () => {
  beforeAll(async () => {
    await callWhenOnline(async () => {
      servers = await createKibanaServer({
        security: {
          enabled: false,
        },
      });
    });
  });
  afterAll(async () => {
    if (servers) {
      await servers.shutdown();
    }
  });

  it('should run online or offline', async () => {
    const res = await memorize('example_test_snapshot', async () => {
      return { serverExists: !!servers.kbnServer };
    });

    expect(res).toBeDefined();
    expect(res.serverExists).toBe(true);
  });
});
