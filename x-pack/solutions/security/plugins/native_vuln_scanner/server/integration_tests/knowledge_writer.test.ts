/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { parseRhelOval } from '../lib/feeds/rhel_oval';
import type { FeedOs } from '../lib/feeds/fetch';
import type { AgentInventoryRows } from '../lib/inventory';
import { findInventoryScheduleIds, readAgentInventories } from '../lib/inventory';
import { FINDINGS_INDEX } from '../lib/findings';
import {
  ensureKnowledgeIndex,
  KNOWLEDGE_INDEX,
  knowledgeMappings,
  toKnowledgeDoc,
  writeKnowledge,
} from '../lib/knowledge';
import { runScan } from '../lib/scan/run_scan';

jest.mock('../lib/inventory', () => ({
  ...jest.requireActual('../lib/inventory'),
  findInventoryScheduleIds: jest.fn(),
  readAgentInventories: jest.fn(),
}));

const rhelFixture = readFileSync(
  join(__dirname, '..', 'lib', 'feeds', '__fixtures__', 'rhel_9_trimmed.oval.xml')
);

const agent: AgentInventoryRows = {
  agentId: 'a1',
  hostName: 'host-a1',
  os: { platform: 'rhel', major: '9', platform_like: 'rhel', name: 'Red Hat Enterprise Linux 9' },
  rpm: [
    {
      name: 'giflib',
      version: '5.2.1',
      release: '9.el9',
      arch: 'x86_64',
      source: 'giflib-5.2.1-9.el9.src.rpm',
    },
  ],
};

async function* rows() {
  yield agent;
}

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

describe('knowledge index', () => {
  let esServer: TestElasticsearchUtils;
  let admin: Client;
  let kibana: Client;

  const count = async (index: string): Promise<number> => {
    await admin.indices.refresh({ index });
    return (await admin.count({ index })).count;
  };

  const scan = (es: Client, runId: string) =>
    runScan(
      {
        es,
        packRepository: savedObjectsRepositoryMock.create(),
        logger: loggingSystemMock.createLogger(),
        loadFeed: async (_os: FeedOs) => ({
          status: 'ok',
          feed: await parseRhelOval([rhelFixture], { major: '9' }),
        }),
        loadKev: async () => ({ status: 'unavailable', reason: 'offline' }),
        now: () => new Date('2026-11-13T10:00:00.000Z'),
      },
      { signal: new AbortController().signal, runId }
    );

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    admin = esServer.es.getClient();
    kibana = kibanaSystemClient(esServer);
    (findInventoryScheduleIds as jest.Mock).mockResolvedValue({
      rpm_packages: ['p'],
      os_version: ['o'],
    });
    (readAgentInventories as jest.Mock).mockImplementation(() => rows());
  });

  afterAll(async () => {
    await kibana?.close();
    await esServer?.stop();
  });

  it('creates a lookup-mode strict index idempotently and accepts a mapped doc', async () => {
    await ensureKnowledgeIndex(admin);
    await ensureKnowledgeIndex(admin);

    const { [KNOWLEDGE_INDEX]: index } = await admin.indices.get({ index: KNOWLEDGE_INDEX });
    expect(index.settings?.index?.mode).toBe('lookup');
    expect(index.mappings?.dynamic).toBe('strict');
    expect(Object.keys(index.mappings?.properties ?? {}).sort()).toEqual(
      Object.keys(knowledgeMappings.properties ?? {}).sort()
    );

    const doc = toKnowledgeDoc(
      'cve:redhat:9:CVE-2026-0',
      { kind: 'cve', id: 'CVE-2026-0', description: 'text' },
      { source: 'redhat', os: { family: 'rhel', version: '9' }, now: '2026-11-13T10:00:00.000Z' }
    );
    await admin.index({ index: KNOWLEDGE_INDEX, id: 'cve:redhat:9:CVE-2026-0', document: doc });
    await admin.delete({ index: KNOWLEDGE_INDEX, id: 'cve:redhat:9:CVE-2026-0', refresh: true });
  });

  it('writes the text with the privileges of kibana_system and writes nothing on the second run', async () => {
    const entries = new Map(
      [0, 1].map((n) => [
        `cve:redhat:9:CVE-2026-${n}`,
        { kind: 'cve' as const, id: `CVE-2026-${n}`, description: `text ${n}` },
      ])
    );
    const params = {
      ids: new Set(entries.keys()),
      knowledge: entries,
      source: 'redhat' as const,
      os: { family: 'rhel', version: '9' },
      now: '2026-11-13T10:00:00.000Z',
    };

    expect(await writeKnowledge(kibana, params)).toEqual({ written: 2, unchanged: 0, failed: 0 });
    expect(await writeKnowledge(kibana, params)).toEqual({ written: 0, unchanged: 2, failed: 0 });
    expect(await count(KNOWLEDGE_INDEX)).toBe(2);

    const changed = new Map(entries).set('cve:redhat:9:CVE-2026-1', {
      kind: 'cve' as const,
      id: 'CVE-2026-1',
      description: 'text 1 revised',
    });
    expect(await writeKnowledge(kibana, { ...params, knowledge: changed })).toEqual({
      written: 1,
      unchanged: 1,
      failed: 0,
    });
  });

  it('runs a whole scan: findings and knowledge are written, and a rerun writes no knowledge', async () => {
    const first = await scan(kibana, 'run-1');
    expect(first.findings).toBeGreaterThan(0);
    expect(first.knowledge.failed).toBe(0);
    expect(first.knowledge.written).toBeGreaterThan(0);

    const second = await scan(kibana, 'run-2');
    expect(second.knowledge).toEqual({
      written: 0,
      unchanged: first.knowledge.written,
      failed: 0,
      skippedReleases: [],
    });
    expect(await count(FINDINGS_INDEX)).toBe(first.findings);
  });

  it('leaves the findings written when the knowledge index cannot be used', async () => {
    const before = await count(FINDINGS_INDEX);
    await admin.indices.delete({ index: KNOWLEDGE_INDEX });
    // A plain index whose mapping conflicts with the writer's (content_hash as integer): putMapping fails.
    await admin.indices.create({
      index: KNOWLEDGE_INDEX,
      mappings: { dynamic: 'strict', properties: { content_hash: { type: 'integer' } } },
    });

    const summary = await scan(kibana, 'run-3');

    expect(summary.releases).toEqual({ 'rhel:9': 'matched' });
    expect(summary.findings).toBeGreaterThan(0);
    expect(summary.knowledge.written).toBe(0);
    expect(summary.knowledge.failed).toBeGreaterThan(0);
    expect(await count(FINDINGS_INDEX)).toBe(before);
    const { hits } = await admin.search({ index: FINDINGS_INDEX, size: 100 });
    expect(
      hits.hits.every(
        ({ _source }) =>
          (_source as { native_vuln_scanner: { run_id: string } }).native_vuln_scanner.run_id ===
          'run-3'
      )
    ).toBe(true);
  });
});
