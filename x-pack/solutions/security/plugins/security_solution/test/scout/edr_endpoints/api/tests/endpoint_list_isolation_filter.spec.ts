/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags, type ApiClientFixture } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { EndpointMetadataGenerator } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import {
  HOST_METADATA_LIST_ROUTE,
  METADATA_DATASTREAM,
  POLICY_RESPONSE_INDEX,
} from '../../../../../common/endpoint/constants';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import {
  deleteIndexedHostsAndAlerts,
  indexHostsAndAlerts,
  type IndexedHostsAndAlertsResponse,
} from '../../../../../common/endpoint/index_data';
import {
  ENDPOINT_ALERTS_INDEX,
  ENDPOINT_DEVICE_INDEX,
  ENDPOINT_EVENTS_INDEX,
} from '../../../../../scripts/endpoint/common/constants';
import { createSystemIndicesEsClient } from '../../../edr_response_actions/ui/fixtures/system_indices_es_client';
import { apiTest, testData } from '../fixtures';

interface MetadataListBody {
  data: Array<{
    metadata: {
      host: { hostname: string };
      Endpoint: { state?: { isolation?: boolean } };
    };
  }>;
  total: number;
}

const metadataGenerator = (isolation: boolean) =>
  EndpointDocGenerator.custom({
    CustomMetadataGenerator: EndpointMetadataGenerator.custom({ isolation }),
  });

const indexHost = ({
  esClient,
  kbnClient,
  isolation,
  isServerless,
}: {
  esClient: Parameters<typeof indexHostsAndAlerts>[0];
  kbnClient: Parameters<typeof indexHostsAndAlerts>[1];
  isolation: boolean;
  isServerless: boolean;
}): Promise<IndexedHostsAndAlertsResponse> =>
  indexHostsAndAlerts(
    esClient,
    kbnClient,
    `endpoint-isolation-filter-${isolation}-${randomUUID()}`,
    1,
    1,
    METADATA_DATASTREAM,
    POLICY_RESPONSE_INDEX,
    ENDPOINT_EVENTS_INDEX,
    ENDPOINT_ALERTS_INDEX,
    ENDPOINT_DEVICE_INDEX,
    0,
    true,
    {},
    metadataGenerator(isolation),
    false,
    undefined,
    undefined,
    isServerless
  );

const INDEXING_TIMEOUT_MS = 10 * 60 * 1000;
// The united transform is started and not awaited. Give it time to copy both hosts
// into the index the metadata list route reads.
const UNITED_METADATA_SYNC_TIMEOUT_MS = 120_000;
const FILTER_TEST_TIMEOUT_MS = UNITED_METADATA_SYNC_TIMEOUT_MS * 2 + 30_000;

const hostnameOf = (indexed: IndexedHostsAndAlertsResponse): string => {
  const hostname = indexed.hosts.at(-1)?.host.hostname;
  if (!hostname) {
    throw new Error('Indexed endpoint host is missing a hostname');
  }
  return hostname;
};

apiTest.describe('Endpoint list isolation filter', { tag: tags.stateful.classic }, () => {
  let headers: Record<string, string>;
  let isolatedHostname: string;
  let unisolatedHostname: string;
  const indexedHosts: IndexedHostsAndAlertsResponse[] = [];

  apiTest.beforeAll(async ({ requestAuth, esClient, kbnClient, config }) => {
    apiTest.setTimeout(INDEXING_TIMEOUT_MS);

    const { apiKeyHeader } = await requestAuth.getApiKeyForPrivilegedUser();
    headers = {
      ...apiKeyHeader,
      ...testData.COMMON_HEADERS,
    };

    // `.fleet-agents` is restricted. Indexed fleet agent documents stand in for enrollment.
    const systemEsClient = await createSystemIndicesEsClient(esClient, config);
    try {
      const isolated = await indexHost({
        esClient: systemEsClient,
        kbnClient,
        isolation: true,
        isServerless: config.serverless,
      });
      indexedHosts.push(isolated);
      isolatedHostname = hostnameOf(isolated);

      const unisolated = await indexHost({
        esClient: systemEsClient,
        kbnClient,
        isolation: false,
        isServerless: config.serverless,
      });
      indexedHosts.push(unisolated);
      unisolatedHostname = hostnameOf(unisolated);
    } finally {
      await systemEsClient.close();
    }
  });

  apiTest.afterAll(async ({ esClient, kbnClient, config }) => {
    if (indexedHosts.length === 0) {
      return;
    }

    const systemEsClient = await createSystemIndicesEsClient(esClient, config);
    try {
      const results = await Promise.allSettled(
        indexedHosts.map((indexed) =>
          deleteIndexedHostsAndAlerts(systemEsClient, kbnClient, indexed)
        )
      );
      const failures = results.flatMap((result) =>
        result.status === 'rejected' ? [String(result.reason)] : []
      );
      expect(failures, failures.join('\n')).toHaveLength(0);
    } finally {
      await systemEsClient.close();
    }
  });

  const listByIsolation = (apiClient: ApiClientFixture, hostname: string, isolation: boolean) => {
    const kuery = `united.endpoint.Endpoint.state.isolation:${isolation} and united.endpoint.host.hostname:"${hostname}"`;
    return apiClient.get<MetadataListBody>(
      `${HOST_METADATA_LIST_ROUTE}?kuery=${encodeURIComponent(kuery)}`,
      {
        headers,
        responseType: 'json',
      }
    );
  };

  // indexHostsAndAlerts starts the united metadata transform and returns before those docs
  // are searchable. Poll the list route until the unisolated host is returned for
  // isolation:false, so a later isolation:true miss cannot pass while that host is absent.
  // The isolated host can land in a later checkpoint, so wait for it too.
  const waitUntilHostIsListed = async (
    apiClient: ApiClientFixture,
    hostname: string,
    isolation: boolean
  ) => {
    await expect
      .poll(
        async () => {
          const response = await listByIsolation(apiClient, hostname, isolation);
          if (response.statusCode !== 200) {
            return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
          }
          return response.body.total;
        },
        {
          timeout: UNITED_METADATA_SYNC_TIMEOUT_MS,
          intervals: [2_000],
        }
      )
      .toBe(1);
  };

  apiTest(
    'metadata list returns only the host whose isolation state matches the kuery',
    async ({ apiClient }) => {
      apiTest.setTimeout(FILTER_TEST_TIMEOUT_MS);
      await waitUntilHostIsListed(apiClient, unisolatedHostname, false);
      await waitUntilHostIsListed(apiClient, isolatedHostname, true);

      const isolated = await listByIsolation(apiClient, isolatedHostname, true);
      expect(isolated.statusCode).toBe(200);
      const isolatedBody = isolated.body as MetadataListBody;
      expect(isolatedBody.total).toBe(1);
      expect(isolatedBody.data.map((host) => host.metadata.host.hostname)).toStrictEqual([
        isolatedHostname,
      ]);
      expect(isolatedBody.data[0]?.metadata.Endpoint.state?.isolation).toBe(true);

      const excluded = await listByIsolation(apiClient, unisolatedHostname, true);
      expect(excluded.statusCode).toBe(200);
      expect((excluded.body as MetadataListBody).total).toBe(0);
      expect((excluded.body as MetadataListBody).data).toStrictEqual([]);
    }
  );
});
