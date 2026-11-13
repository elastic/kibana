/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { Finding } from '../lib/matcher';
import type { FindingDoc, HostMeta } from '../lib/findings';
import {
  ensureFindingsIndex,
  FINDINGS_ALIAS,
  FINDINGS_INDEX,
  writeFindings,
} from '../lib/findings';

const CDR_PATTERN = 'security_solution-*.vulnerability_latest';

const HOST: HostMeta = { id: 'h1', name: 'web-1', os: { family: 'ubuntu', version: 'noble' } };

const finding = (cveId: string, version = '3.0.13-0ubuntu3'): Finding => ({
  hostId: HOST.id,
  cve: {
    id: cveId,
    url: `https://ubuntu.com/security/${cveId}`,
    published: '2026-03-10T18:53:00Z',
    severity: 'medium',
    cvss: { version: '3.1', score: 7.8, vector: 'CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H' },
  },
  kind: 'package',
  package: { name: 'openssl', version, arch: 'amd64', source: 'openssl' },
  fixedVersion: '3.0.13-0ubuntu3.4',
  scheme: 'dpkg',
  advisories: [
    {
      id: 'oval:com.ubuntu.noble:def:1',
      source: 'ubuntu',
      definition_id: 'oval:com.ubuntu.noble:def:1',
      title: `${cveId} on Ubuntu 24.04 LTS (noble) - medium`,
      url: `https://ubuntu.com/security/${cveId}`,
      severity: 'Medium',
    },
  ],
  why: `openssl ${version} is earlier than 3.0.13-0ubuntu3.4 (oval:com.ubuntu.noble:def:1)`,
  feedSnapshotTime: '2026-11-12T03:00:00Z',
});

const at = (minute: number) => `2026-11-13T10:${String(minute).padStart(2, '0')}:00.000Z`;

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

describe('findings writer', () => {
  let esServer: TestElasticsearchUtils;
  let admin: Client;
  let kibana: Client;

  const byCve = async (index: string): Promise<Map<string, FindingDoc>> => {
    const { hits } = await admin.search<FindingDoc>({ index, size: 100, query: { match_all: {} } });
    return new Map(
      hits.hits.flatMap(({ _source: doc }) => (doc ? [[doc.vulnerability.id, doc]] : []))
    );
  };

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    admin = esServer.es.getClient();
    kibana = kibanaSystemClient(esServer);
  });

  afterAll(async () => {
    await kibana?.close();
    await esServer?.stop();
  });

  it('sets up the index idempotently with the privileges of kibana_system', async () => {
    expect((await kibana.security.authenticate()).username).toBe('kibana_system');
    // Negative control: the role really is restricted, so the setup below proves its grants.
    await expect(
      kibana.index({ index: 'logs-native_vuln_scanner-default', document: {} })
    ).rejects.toMatchObject({ meta: { statusCode: 403 } });

    await ensureFindingsIndex(kibana);
    await ensureFindingsIndex(kibana);

    const aliases = await admin.indices.getAlias({ name: FINDINGS_ALIAS });
    expect(Object.keys(aliases)).toEqual([FINDINGS_INDEX]);
    expect(aliases[FINDINGS_INDEX].aliases[FINDINGS_ALIAS]).toMatchObject({
      is_write_index: true,
      filter: { bool: { must_not: [{ term: { 'native_vuln_scanner.state': 'fixed' } }] } },
    });
  });

  it('tracks a finding through new, active, fixed and reopened', async () => {
    const write = (minute: number, findings: Finding[]) =>
      writeFindings(kibana, { hosts: [HOST], findings, now: at(minute), runId: `run-${minute}` });

    expect(await write(0, [finding('CVE-2026-1'), finding('CVE-2026-2')])).toEqual({
      written: 2,
      fixed: 0,
      failures: {},
    });
    let docs = await byCve(FINDINGS_INDEX);
    expect(docs.get('CVE-2026-1')?.native_vuln_scanner.state).toBe('new');

    expect(await write(1, [finding('CVE-2026-1')])).toMatchObject({ written: 1, fixed: 1 });
    docs = await byCve(FINDINGS_INDEX);
    expect(docs.get('CVE-2026-1')?.native_vuln_scanner).toMatchObject({
      state: 'active',
      first_seen: at(0),
      last_seen: at(1),
      run_id: 'run-1',
    });
    expect(docs.get('CVE-2026-1')?.event.created).toBe(at(0));
    expect(docs.get('CVE-2026-2')?.native_vuln_scanner).toMatchObject({
      state: 'fixed',
      fixed_at: at(1),
      run_id: 'run-0',
    });
    expect(docs.get('CVE-2026-2')?.['@timestamp']).toBe(at(1));

    // The CNVM UI reads through the alias pattern and must not list the fixed finding.
    expect([...(await byCve(CDR_PATTERN)).keys()]).toEqual(['CVE-2026-1']);

    expect(await write(2, [finding('CVE-2026-1'), finding('CVE-2026-2')])).toMatchObject({
      written: 2,
      fixed: 0,
    });
    docs = await byCve(FINDINGS_INDEX);
    expect(docs.get('CVE-2026-2')?.native_vuln_scanner).toMatchObject({
      state: 'reopened',
      first_seen: at(0),
    });
    expect(docs.get('CVE-2026-2')?.native_vuln_scanner.fixed_at).toBeUndefined();
    expect([...(await byCve(CDR_PATTERN)).keys()].sort()).toEqual(['CVE-2026-1', 'CVE-2026-2']);
  });

  it('leaves findings of hosts outside the run untouched', async () => {
    const other: HostMeta = { ...HOST, id: 'h2' };
    await writeFindings(kibana, {
      hosts: [other],
      findings: [{ ...finding('CVE-2026-9'), hostId: 'h2' }],
      now: at(3),
      runId: 'run-3',
    });

    const result = await writeFindings(kibana, {
      hosts: [HOST],
      findings: [],
      now: at(4),
      runId: 'run-4',
    });

    expect(result.fixed).toBe(2);
    const docs = await byCve(FINDINGS_INDEX);
    expect(docs.get('CVE-2026-9')?.native_vuln_scanner.state).toBe('new');
    expect(docs.get('CVE-2026-1')?.native_vuln_scanner.state).toBe('fixed');
  });
});
