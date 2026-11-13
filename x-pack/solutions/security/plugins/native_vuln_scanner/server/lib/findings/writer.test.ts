/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Finding } from '../matcher';
import { FINDINGS_INDEX } from './constants';
import type { HostMeta } from './finding_doc';
import { FindingsWriteError, writeFindings } from './writer';

const host = (id: string): HostMeta => ({ id, os: { family: 'ubuntu', version: 'noble' } });

const finding = (hostId: string, cveId: string): Finding => ({
  hostId,
  cve: { id: cveId },
  kind: 'package',
  package: { name: 'openssl', version: '3.0.13-0ubuntu3' },
  fixedVersion: '3.0.13-0ubuntu3.4',
  scheme: 'dpkg',
  advisories: [],
  why: 'openssl 3.0.13-0ubuntu3 is earlier than 3.0.13-0ubuntu3.4 (oval:x)',
});

const okBulk = (count: number): BulkResponse => ({
  errors: false,
  took: 1,
  items: Array.from({ length: count }, () => ({ update: { _index: FINDINGS_INDEX, status: 200 } })),
});

const PARAMS = { now: '2026-11-13T10:00:00.000Z', runId: 'run-1' };

describe('writeFindings', () => {
  let es: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    es = elasticsearchServiceMock.createElasticsearchClient();
    es.bulk.mockImplementation(async (req) => okBulk((req?.operations?.length ?? 0) / 2));
    es.updateByQuery.mockResolvedValue({ updated: 2 });
  });

  it('upserts each finding once by its deterministic id, then fixes absent ones', async () => {
    const result = await writeFindings(es, {
      ...PARAMS,
      hosts: [host('h1')],
      findings: [finding('h1', 'CVE-1'), finding('h1', 'CVE-1'), finding('h1', 'CVE-2')],
    });

    expect(result).toEqual({ written: 2, fixed: 2, fixSkipped: 0, failures: {} });
    const operations = es.bulk.mock.calls[0][0].operations ?? [];
    expect(operations).toHaveLength(4);
    expect(operations[0]).toMatchObject({ update: { _index: FINDINGS_INDEX } });
    expect(operations[1]).toMatchObject({ upsert: { vulnerability: { id: 'CVE-1' } } });

    const [fixRequest] = es.updateByQuery.mock.calls[0];
    expect(fixRequest).toMatchObject({
      index: FINDINGS_INDEX,
      query: {
        bool: {
          filter: [{ terms: { 'host.id': ['h1'] } }],
          must_not: [
            { term: { 'native_vuln_scanner.state': 'fixed' } },
            { term: { 'native_vuln_scanner.run_id': 'run-1' } },
          ],
        },
      },
    });
  });

  it('fixes the findings of a scanned host that has no findings left', async () => {
    const result = await writeFindings(es, { ...PARAMS, hosts: [host('h1')], findings: [] });
    expect(es.bulk).not.toHaveBeenCalled();
    expect(result.fixed).toBe(2);
  });

  it('reports open findings the fix pass skipped on conflicts or failures', async () => {
    es.updateByQuery.mockResolvedValue({
      updated: 1,
      version_conflicts: 2,
      failures: [{ id: 'x', index: FINDINGS_INDEX, status: 500, cause: { type: 'boom' } }],
    });
    const result = await writeFindings(es, { ...PARAMS, hosts: [host('h1')], findings: [] });
    expect(result).toMatchObject({ fixed: 1, fixSkipped: 3 });
  });

  it('never runs the fix pass when an upsert failed', async () => {
    es.bulk.mockResolvedValue({
      errors: true,
      took: 1,
      items: [
        { update: { _index: FINDINGS_INDEX, status: 200 } },
        {
          update: {
            _index: FINDINGS_INDEX,
            status: 400,
            error: { type: 'strict_dynamic_mapping_exception', reason: 'x' },
          },
        },
      ],
    });

    const write = writeFindings(es, {
      ...PARAMS,
      hosts: [host('h1')],
      findings: [finding('h1', 'CVE-1'), finding('h1', 'CVE-2')],
    });

    await expect(write).rejects.toThrow(FindingsWriteError);
    await expect(write).rejects.toMatchObject({
      failures: { '400:strict_dynamic_mapping_exception': 1 },
    });
    expect(es.updateByQuery).not.toHaveBeenCalled();
  });

  it('rejects a finding whose host was not scanned', async () => {
    await expect(
      writeFindings(es, { ...PARAMS, hosts: [host('h1')], findings: [finding('h2', 'CVE-1')] })
    ).rejects.toThrow(/no host metadata/);
    expect(es.bulk).not.toHaveBeenCalled();
  });

  it('splits large writes and host lists into batches', async () => {
    const hosts = Array.from({ length: 1001 }, (_, i) => host(`h${i}`));
    const findings = Array.from({ length: 501 }, (_, i) => finding(`h${i}`, 'CVE-1'));

    const result = await writeFindings(es, { ...PARAMS, hosts, findings });

    expect(es.bulk).toHaveBeenCalledTimes(2);
    expect(es.updateByQuery).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ written: 501, fixed: 4 });
  });
});
