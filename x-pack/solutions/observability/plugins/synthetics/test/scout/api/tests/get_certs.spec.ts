/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeUpSummary } from '@kbn/observability-synthetics-test-data';
import type { ApiClientFixture, EsClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, mergeSyntheticsApiHeaders, SYNTHETICS_API_URLS } from '../fixtures';
import { addMonitor } from '../fixtures/monitors';

const SYNTHETICS_MONITOR_TYPE = 'synthetics-monitor';
const LEGACY_SYNTHETICS_MONITOR_TYPE = 'synthetics-monitor-multi-space';

const HTTP_DATA_STREAM = 'synthetics-http-default';
const TEST_TAG = 'scout-cert-tag';

const DAY_MS = 24 * 60 * 60 * 1000;

interface CertResultBody {
  total: number;
  stats?: { expired: number; expiringSoon: number };
  certs: Array<{
    common_name?: string;
    issuer?: string;
    sha256?: string;
    monitorType?: string;
    monitors: Array<{ id?: string; type?: string }>;
  }>;
}

/**
 * API coverage for the certificates route (`GET internal/synthetics/certs`),
 * focused on the changes that power the TLS Certificates page: browser-inclusive
 * querying, the summary-stats aggregation (`stats.expired` / `stats.expiringSoon`),
 * and the `monitorTypes` / `tags` quick-filter query params.
 *
 * Tests share worker-scoped Kibana/ES state and run sequentially, so the empty
 * assertion runs first and later tests build on the seeded certificates.
 */
apiTest.describe(
  'getCertificates',
  {
    tag: ['@local-stateful-classic', '@local-serverless-observability_complete'],
  },
  () => {
    let editorHeaders: Record<string, string>;
    let monitorId: string;
    const now = Date.now();

    const indexCertPing = async (
      esClient: EsClient,
      {
        commonName,
        sha256,
        tlsNotAfter,
      }: {
        commonName: string;
        sha256: string;
        tlsNotAfter: string;
      }
    ) => {
      // Start from a realistic "up" summary ping (carries final-attempt summary,
      // recent timespan and full `tls.server.*`), then override the fields the
      // certs query dedupes/buckets on.
      const document = makeUpSummary({
        monitorId,
        configId: monitorId,
        timestamp: new Date(now).toISOString(),
        tlsNotAfter,
      }) as Record<string, any>;
      document.tags = [TEST_TAG];
      document.tls.server.x509.subject.common_name = commonName;
      document.tls.server.x509.subject.distinguished_name = `CN=${commonName}`;
      document.tls.server.hash.sha256 = sha256;

      await esClient.index({ index: HTTP_DATA_STREAM, document, refresh: 'wait_for' });
    };

    const getCerts = async (apiClient: ApiClientFixture, query = '') => {
      const res = await apiClient.get(`${SYNTHETICS_API_URLS.CERTS}${query}`, {
        headers: editorHeaders,
        responseType: 'json',
      });
      return res;
    };

    apiTest.beforeAll(async ({ requestAuth, apiServices, kbnClient }) => {
      await kbnClient.savedObjects.clean({
        types: [SYNTHETICS_MONITOR_TYPE, LEGACY_SYNTHETICS_MONITOR_TYPE],
      });
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
      await apiServices.syntheticsPrivateLocations.getSharedPrivateLocation();
    });

    apiTest.afterAll(async ({ kbnClient, esClient }) => {
      await kbnClient.savedObjects.clean({
        types: [SYNTHETICS_MONITOR_TYPE, LEGACY_SYNTHETICS_MONITOR_TYPE],
      });
      await esClient.deleteByQuery({
        index: `${HTTP_DATA_STREAM}*`,
        query: { term: { tags: TEST_TAG } },
        conflicts: 'proceed',
        refresh: true,
        ignore_unavailable: true,
      });
    });

    apiTest('returns an empty result when no monitors are configured', async ({ apiClient }) => {
      const res = await getCerts(apiClient);
      expect(res).toHaveStatusCode(200);
      expect(res.body).toMatchObject({ certs: [], total: 0 });
    });

    apiTest(
      'returns lightweight certificates with expiry summary stats',
      async ({ apiClient, apiServices, esClient }) => {
        const privateLocation =
          await apiServices.syntheticsPrivateLocations.getSharedPrivateLocation();
        const created = await addMonitor(apiClient, editorHeaders, {
          name: 'Cert HTTP monitor',
          type: 'http',
          urls: 'https://cert.scout.test',
          tags: [TEST_TAG],
          locations: [privateLocation],
        });
        monitorId = (created.body as { id: string }).id;

        // One cert per expiry bucket so the stats aggregation is exercised:
        // valid (far future), expiring within the 30d threshold, and expired.
        await indexCertPing(esClient, {
          commonName: 'valid.scout.test',
          sha256: 'a'.repeat(64),
          tlsNotAfter: new Date(now + 60 * DAY_MS).toISOString(),
        });
        await indexCertPing(esClient, {
          commonName: 'expiring.scout.test',
          sha256: 'b'.repeat(64),
          tlsNotAfter: new Date(now + 10 * DAY_MS).toISOString(),
        });
        await indexCertPing(esClient, {
          commonName: 'expired.scout.test',
          sha256: 'c'.repeat(64),
          tlsNotAfter: new Date(now - 10 * DAY_MS).toISOString(),
        });

        const res = await getCerts(apiClient);
        expect(res).toHaveStatusCode(200);
        const body = res.body as CertResultBody;

        expect(body.total).toBe(3);
        expect(body.stats).toStrictEqual({ expired: 1, expiringSoon: 1 });

        const validCert = body.certs.find((cert) => cert.common_name === 'valid.scout.test');
        expect(validCert).toBeDefined();
        expect(validCert).toMatchObject({
          common_name: 'valid.scout.test',
          issuer: 'GTS CA 1C3',
          monitorType: 'http',
        });
        expect(typeof validCert?.sha256).toBe('string');
        expect(validCert?.monitors?.[0]).toMatchObject({ id: monitorId, type: 'http' });
      }
    );

    apiTest('filters certificates by monitor type', async ({ apiClient }) => {
      const tcpRes = await getCerts(apiClient, '?monitorTypes=tcp');
      expect(tcpRes).toHaveStatusCode(200);
      expect((tcpRes.body as CertResultBody).total).toBe(0);

      const httpRes = await getCerts(apiClient, '?monitorTypes=http');
      expect(httpRes).toHaveStatusCode(200);
      expect((httpRes.body as CertResultBody).total).toBe(3);
    });

    apiTest('filters certificates by tag', async ({ apiClient }) => {
      const matchRes = await getCerts(apiClient, `?tags=${TEST_TAG}`);
      expect(matchRes).toHaveStatusCode(200);
      expect((matchRes.body as CertResultBody).total).toBe(3);

      const missRes = await getCerts(apiClient, '?tags=this-tag-does-not-exist');
      expect(missRes).toHaveStatusCode(200);
      expect((missRes.body as CertResultBody).total).toBe(0);
    });
  }
);
