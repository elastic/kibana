/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { ExtractIocsResult } from '../../../../server/threat_intel/services/extract_iocs';
import {
  CREATE_THREAT_REPORT_API_PATH,
  EXTRACT_IOCS_API_PATH,
} from '../../../../common/threat_intel';
import { apiTest, tags, TI_HEADERS, cleanupThreatReportsByIds } from '../fixtures';

interface CreateReportResponse {
  status: 'ingested' | 'duplicate';
  report_id: string;
}

/** Shaped from the service's own result type so a field rename fails the type check. */
type ExtractIocsResponse = ExtractIocsResult;

/**
 * Live ingest and dedup against `.kibana-threat-reports`. Bootstrap creates that
 * companion index after the templates land, so a healthy Scout stack already has
 * it. The create path still uses `ignore_unavailable` on the dedup precheck so a
 * missing index (bootstrap incomplete, index deleted) does not 500 before the
 * write; unit tests mock ES and never exercise that path on a real cluster.
 */
apiTest.describe('Threat Intel - report ingest API', { tag: [...tags.stateful.classic] }, () => {
  let writeHeaders: Record<string, string>;
  const createdReportIds: string[] = [];

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    writeHeaders = {
      ...TI_HEADERS,
      ...cookieHeader,
    };
  });

  apiTest.afterAll(async ({ esClient }) => {
    await cleanupThreatReportsByIds(esClient, createdReportIds);
  });

  apiTest('ingests a pasted report, then dedups an identical repeat', async ({ apiClient }) => {
    const unique = `scout-${Date.now()}`;
    const body = {
      title: `Scout ingest smoke ${unique}`,
      body_text:
        `Observed beaconing to 203.0.113.77 and a payload hash of ` +
        `44d88612fea8a8f36de82e1278abb02f for ${unique}.`,
      source_name: 'Scout API test',
    };

    const first = await apiClient.post(CREATE_THREAT_REPORT_API_PATH, {
      headers: writeHeaders,
      responseType: 'json',
      body,
    });

    // Ingest against the bootstrapped reports index. A regression in the dedup
    // precheck (for example dropping `ignore_unavailable`) surfaces here as a 500
    // only when the index is missing; on a healthy stack this is the happy path.
    expect(first).toHaveStatusCode(200);
    const firstBody = first.body as CreateReportResponse;
    expect(firstBody.status).toBe('ingested');
    expect(firstBody.report_id).toBeDefined();
    createdReportIds.push(firstBody.report_id);

    // Byte-identical content fingerprints the same, so the second call must be
    // recognized as a duplicate and must not create a second report.
    const second = await apiClient.post(CREATE_THREAT_REPORT_API_PATH, {
      headers: writeHeaders,
      responseType: 'json',
      body,
    });

    expect(second).toHaveStatusCode(200);
    const secondBody = second.body as CreateReportResponse;
    expect(secondBody.status).toBe('duplicate');
    expect(secondBody.report_id).toBe(firstBody.report_id);
  });

  apiTest('rejects a report body that fails schema validation', async ({ apiClient }) => {
    const res = await apiClient.post(CREATE_THREAT_REPORT_API_PATH, {
      headers: writeHeaders,
      responseType: 'json',
      body: { title: '', body_text: '', source_name: '' },
    });

    expect(res).toHaveStatusCode(400);
    // Assert the body too: Kibana's generic 404 handler and a schema rejection both
    // return 400/404, so a status-only check passes when no handler is registered.
    expect((res.body as { message: string }).message).toMatch(/title|body_text|source_name/);
  });

  apiTest('extracts indicators from pasted text without calling a model', async ({ apiClient }) => {
    const res = await apiClient.post(EXTRACT_IOCS_API_PATH, {
      headers: writeHeaders,
      responseType: 'json',
      body: {
        text:
          'Traffic to 198.51.100.24 and hxxps://malicious[.]example/payload was observed, ' +
          'with SHA256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.',
      },
    });

    expect(res).toHaveStatusCode(200);
    const body = res.body as ExtractIocsResponse;
    expect(Array.isArray(body.iocs)).toBe(true);
    // Deterministic extraction: the same text must always yield the ipv4 above.
    const values = body.iocs.map((i) => i.value);
    expect(values).toContain('198.51.100.24');
  });
});
