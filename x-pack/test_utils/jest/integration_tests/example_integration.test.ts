/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as kbnTestServer from '../../../../src/test_utils/kbn_server';
import { TestKbnServerConfig } from '../../kbn_server_config';

describe('example integration test with kbn server', () => {
  let kbn: any;
  let kbnServer: any;
  let kbnRootServer: any;
  let esServer: any;
  beforeAll(async () => {
    const servers = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: TestKbnServerConfig,
    });
    esServer = await servers.startES();
    kbn = await servers.startKibana();
    kbnRootServer = kbn.root;
    kbnServer = kbn.kbnServer;

    expect(servers).toBeDefined();
    expect(kbnServer).toBeDefined();
  });

  afterAll(async () => {
    await esServer.stop();
    await kbn.stop();
  });

  it('should have started new platform server correctly', () => {
    expect(kbnRootServer.root).toBeDefined();
    expect(kbnServer.server).toBeDefined();
    expect(kbnServer.server.plugins).toBeDefined();
  });
});
