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
import * as legacyElasticsearch from 'elasticsearch';

const { callWhenOnline, memorize } = Slapshot;

let servers: { kbnServer: any; shutdown: () => void };
let esArchiver: EsArchiver;

// FLAKY: https://github.com/elastic/kibana/issues/44250
describe.skip('Example contract tests', () => {
  beforeAll(async () => {
    await callWhenOnline(async () => {
      servers = await createKibanaServer();
      esArchiver = getEsArchiver({
        kibanaUrl: servers.kbnServer.info.uri,
        dir: path.resolve(__dirname, 'sample_es_archives'),
      });
    });
  });
  afterAll(async () => {
    if (servers) {
      await servers.shutdown();
    }
  });

  beforeEach(async () => await callWhenOnline(() => esArchiver.load('example')));
  afterEach(async () => await callWhenOnline(() => esArchiver.unload('example')));

  it('should run online or offline', async () => {
    const res = await memorize('example_test_snapshot', async () => {
      return { serverExists: !!servers.kbnServer };
    });

    expect(res).toBeDefined();
    expect(res.serverExists).toBe(true);
  });

  it('should have loaded sample data use esArchive', async () => {
    const dataInES: any = await memorize('sample_data', () => {
      // To keep things simple in this example, getting the connection infor the the JEST contract test ES server
      const esConfig = JSON.parse(process.env.__JEST__ESServer || '');
      const client = new legacyElasticsearch.Client({
        hosts: esConfig.hosts,
        httpAuth: esConfig.username ? `${esConfig.username}:${esConfig.password}` : undefined,
      });

      return new Promise((resolve, reject) => {
        client.search(
          {
            index: '.management-beats',
            size: 10000,
            ignore: [404],
            body: {
              query: {
                bool: {
                  must: {
                    term: {
                      type: 'beat',
                    },
                  },
                },
              },
            },
          },
          (err, data) => {
            if (err) reject(err);

            resolve(data);
          }
        );
      });
    });

    expect(dataInES).toBeDefined();
    expect(dataInES.hits.hits.length).toEqual(4);
  });
});
