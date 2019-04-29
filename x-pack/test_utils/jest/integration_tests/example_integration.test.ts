/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as kbnTestServer from '../../../../src/test_utils/kbn_server';
import { TestKbnServerConfig } from '../../kbn_server_config';

describe('example integration test with kbn server', async () => {
  let servers: any = null;
  beforeAll(async () => {
    servers = await kbnTestServer.startTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: TestKbnServerConfig,
    });
    expect(servers).toBeDefined();
  });

  afterAll(async () => {
    await servers.stop();
  });

  it('should have started new platform server correctly', () => {
    expect(servers.kbnServer).toBeDefined();
    expect(servers.kbnServer.server).toBeDefined();
    expect(servers.kbnServer.server.plugins).toBeDefined();
  });
});
