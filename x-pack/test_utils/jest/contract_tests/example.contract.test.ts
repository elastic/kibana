/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';

import { createKibanaServer } from './servers';
import { getEsArchiver } from './services/es_archiver';
import { EsArchiver } from 'src/es_archiver';
import * as path from 'path';

const { callWhenOnline, memorize } = Slapshot;

let servers: { kbnServer: any; shutdown: () => void };
let esArchiver: EsArchiver;

describe('Example contract tests', () => {
  beforeAll(async () => {
    await callWhenOnline(async () => {
      servers = await createKibanaServer();
      esArchiver = getEsArchiver({
        kibanaUrl: servers.kbnServer.info.uri,
        dir: path.resolve(__dirname, '..', '..', '..', 'test', 'functional', 'es_archives'),
      });
    });
  });
  afterAll(async () => {
    if (servers) {
      await servers.shutdown();
    }
  });

  beforeEach(async () => await callWhenOnline(esArchiver.load.bind(esArchiver, 'beats/list')));
  afterEach(async () => await callWhenOnline(esArchiver.unload.bind(esArchiver, 'beats/list')));

  it('should run online or offline', async () => {
    const res = await memorize('example_test_snapshot', async () => {
      return { serverExists: !!servers.kbnServer };
    });

    expect(res).toBeDefined();
    expect(res.serverExists).toBe(true);
  });
});
