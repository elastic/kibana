/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { AgentInventoryRows } from '../lib/inventory';
import { normalizeInventories, readAgentInventories } from '../lib/inventory';

const DATA_STREAM = 'logs-osquery_manager.result-default';

const SCHEDULE_IDS = {
  deb_packages: ['deb', 'pack_software-inventory_deb_packages'],
  rpm_packages: ['rpm'],
  os_version: ['os'],
  kernel_info: ['kernel'],
};

/** Shape osquerybeat publishes for one row of a scheduled snapshot query. */
const resultDoc = (
  agentId: string,
  scheduleId: string,
  unixTime: number,
  row: Record<string, unknown>,
  action = 'snapshot'
) => ({
  '@timestamp': new Date().toISOString(),
  agent: { id: agentId },
  host: { name: `${agentId}-host` },
  schedule_id: scheduleId,
  osquery_meta: { type: 'snapshot', action, unix_time: unixTime, counter: 0 },
  osquery: row,
});

const DOCS = [
  resultDoc('ubuntu-1', 'os', 2000, {
    platform: 'ubuntu',
    codename: 'noble',
    major: '24',
    name: 'Ubuntu',
  }),
  resultDoc('ubuntu-1', 'kernel', 2000, { version: '6.8.0-51-generic' }),
  resultDoc('ubuntu-1', 'deb', 2000, {
    name: 'libssl3t64',
    version: '3.0.13-0ubuntu3.4',
    arch: 'amd64',
    source: 'openssl',
    status: 'install ok installed',
  }),
  resultDoc('ubuntu-1', 'deb', 2000, {
    name: 'bash',
    version: '5.2.21-2ubuntu4',
    arch: 'amd64',
    source: 'bash',
    status: 'install ok installed',
  }),
  // The previous day's run and a legacy-schedule run: both superseded.
  resultDoc('ubuntu-1', 'deb', 1000, { name: 'bash', version: '5.2.21-2ubuntu3', arch: 'amd64' }),
  resultDoc('ubuntu-1', 'pack_software-inventory_deb_packages', 500, {
    name: 'old',
    version: '1',
  }),
  // A differential row would read as a one-package inventory.
  resultDoc('ubuntu-1', 'deb', 3000, { name: 'curl', version: '8.5.0-2ubuntu10' }, 'added'),
  resultDoc('rhel-1', 'os', 2100, {
    platform: 'rhel',
    platform_like: 'fedora',
    major: 9,
    name: 'Red Hat Enterprise Linux',
  }),
  resultDoc('rhel-1', 'rpm', 2100, {
    name: 'openssl-libs',
    epoch: 1,
    version: '3.2.2',
    release: '6.el9_5',
    arch: 'x86_64',
    source: 'openssl-3.2.2-6.el9_5.src.rpm',
  }),
  resultDoc('rhel-1', 'rpm', 2100, { name: 'gpg-pubkey', version: 'fd431d51', release: '1' }),
  // Only an OS row so far: skipped, not scanned as empty.
  resultDoc('rhel-2', 'os', 2100, { platform: 'rhel', major: 8 }),
  resultDoc('other', 'unrelated', 2100, { name: 'noise' }),
];

/** Connects as the reserved `kibana_system` user, which is what the plugin runs as. */
const kibanaSystemClient = (esServer: TestElasticsearchUtils): Client => {
  const url = new URL(esServer.es.getHostUrls()[0]);
  url.username = '';
  url.password = '';
  return new Client({
    node: url.toString(),
    auth: { username: 'kibana_system', password: 'changeme' },
    Connection: HttpConnection,
    requestTimeout: 30_000,
  });
};

describe('inventory reader', () => {
  let esServer: TestElasticsearchUtils;
  let admin: Client;
  let kibana: Client;

  const read = async (pageSize: number): Promise<AgentInventoryRows[]> => {
    const out: AgentInventoryRows[] = [];
    const reader = readAgentInventories(kibana as unknown as ElasticsearchClient, {
      scheduleIds: SCHEDULE_IDS,
      pageSize,
    });
    for await (const agent of reader) out.push(agent);
    return out;
  };

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    admin = esServer.es.getClient();
    kibana = kibanaSystemClient(esServer);
    await admin.bulk({
      refresh: 'wait_for',
      operations: DOCS.flatMap((doc) => [{ create: { _index: DATA_STREAM } }, doc]),
    });
  });

  afterAll(async () => {
    await kibana?.close();
    await esServer?.stop();
  });

  it.each([2, 100])('reads the newest snapshot per agent with page size %i', async (pageSize) => {
    const agents = await read(pageSize);

    expect(agents.map(({ agentId }) => agentId)).toEqual(['rhel-1', 'rhel-2', 'ubuntu-1']);
    const ubuntu = agents.find(({ agentId }) => agentId === 'ubuntu-1');
    expect(ubuntu?.deb?.map(({ name }) => name).sort()).toEqual(['bash', 'libssl3t64']);
    expect(ubuntu?.os).toMatchObject({ codename: 'noble' });
    expect(ubuntu?.kernel).toEqual({ version: '6.8.0-51-generic' });
    expect(ubuntu?.hostName).toBe('ubuntu-1-host');
  });

  it('feeds the normaliser end to end', async () => {
    const { hosts, skippedHosts, skippedRows } = normalizeInventories(await read(100));

    expect(hosts.map(({ inventory }) => inventory)).toEqual([
      {
        id: 'rhel-1',
        os: { family: 'rhel', version: '9' },
        kernelRelease: undefined,
        packages: [
          {
            name: 'openssl-libs',
            version: '1:3.2.2-6.el9_5',
            arch: 'x86_64',
            source: 'openssl-3.2.2-6.el9_5.src.rpm',
          },
        ],
      },
      {
        id: 'ubuntu-1',
        os: { family: 'ubuntu', version: 'noble' },
        kernelRelease: '6.8.0-51-generic',
        packages: expect.arrayContaining([
          { name: 'bash', version: '5.2.21-2ubuntu4', arch: 'amd64', source: 'bash' },
          { name: 'libssl3t64', version: '3.0.13-0ubuntu3.4', arch: 'amd64', source: 'openssl' },
        ]),
      },
    ]);
    expect(skippedHosts).toEqual({ missing_packages: 1 });
    expect(skippedRows).toEqual({ rpm_gpg_pubkey: 1 });
  });
});
