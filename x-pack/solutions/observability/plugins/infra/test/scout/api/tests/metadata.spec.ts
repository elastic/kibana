/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../fixtures';

const { COMMON_HEADERS, DATES, ES_ARCHIVES } = testData;

const timeRange700 = {
  from: DATES['7.0.0'].hosts.min,
  to: DATES['7.0.0'].hosts.max,
};

const timeRange660 = {
  from: DATES['6.6.0'].docker.min,
  to: DATES['6.6.0'].docker.max,
};

const timeRange800withAws = {
  from: DATES['8.0.0'].logs_and_metrics_with_aws.min,
  to: DATES['8.0.0'].logs_and_metrics_with_aws.max,
};

interface InfraMetadata {
  features: Array<{ name: string }>;
  name: string;
  info?: {
    timestamp?: string;
    cloud?: Record<string, unknown>;
    agent?: Record<string, unknown>;
    host?: Record<string, unknown>;
  };
}

// Note: `/api/infra/metadata` (InfraMetadataRequestRT in
// x-pack/solutions/observability/plugins/infra/common/http_api/metadata_api.ts) does
// NOT accept a `schema` field in its request body — schema is resolved
// server-side from the source configuration. The bodies below intentionally
// omit `schema`; this is the explicit, documented behavior and not a missed
// audit. See issue #264011.
apiTest.describe(
  'API /api/infra/metadata',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...COMMON_HEADERS };
    });

    apiTest('returns host metadata for 7.0.0 archive', async ({ apiClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVES.HOSTS_7_0_0);

      const response = await apiClient.post('api/infra/metadata', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          nodeId: 'demo-stack-mysql-01',
          nodeType: 'host',
          timeRange: timeRange700,
        },
      });

      expect(response).toHaveStatusCode(200);
      const metadata = response.body as InfraMetadata;
      expect(metadata.features).toHaveLength(12);
      expect(metadata.name).toBe('demo-stack-mysql-01');
    });

    apiTest('returns docker metadata for 6.6.0 archive', async ({ apiClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVES.DOCKER_6_6_0);

      const response = await apiClient.post('api/infra/metadata', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          nodeId: '631f36a845514442b93c3fdd2dc91bcd8feb680b8ac5832c7fb8fdc167bb938e',
          nodeType: 'container',
          timeRange: timeRange660,
        },
      });

      expect(response).toHaveStatusCode(200);
      const metadata = response.body as InfraMetadata;
      expect(metadata.features).toHaveLength(10);
      expect(metadata.name).toBe('docker-autodiscovery_elasticsearch_1');
    });

    apiTest(
      'returns host metadata with cloud info for 8.0.0',
      async ({ apiClient, esArchiver }) => {
        await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGS_AND_METRICS_WITH_AWS_8_0_0);

        const response = await apiClient.post('api/infra/metadata', {
          headers,
          responseType: 'json',
          body: {
            sourceId: 'default',
            nodeId: 'gke-observability-8--observability-8--bc1afd95-f0zc',
            nodeType: 'host',
            timeRange: timeRange800withAws,
          },
        });

        expect(response).toHaveStatusCode(200);
        const metadata = response.body as InfraMetadata;
        expect(metadata.features).toHaveLength(58);
        expect(metadata.name).toBe('gke-observability-8--observability-8--bc1afd95-f0zc');
        expect(new Date(metadata.info?.timestamp ?? '').getTime()).toBeGreaterThan(
          timeRange800withAws.from
        );
        expect(new Date(metadata.info?.timestamp ?? '').getTime()).toBeLessThan(
          timeRange800withAws.to
        );
        expect(metadata.info?.cloud).toStrictEqual({
          availability_zone: 'europe-west1-c',
          instance: {
            name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
            id: '6200309808276807579',
          },
          provider: 'gcp',
          machine: { type: 'n1-standard-4' },
          project: { id: 'elastic-observability' },
        });
        expect(metadata.info?.agent).toStrictEqual({
          hostname: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          id: 'c91c0d2b-6483-46bb-9731-f06afd32bb59',
          ephemeral_id: '7cb259b1-795c-4c76-beaf-2eb8f18f5b02',
          type: 'metricbeat',
          version: '8.0.0',
        });
        expect(metadata.info?.host).toStrictEqual({
          hostname: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          os: {
            kernel: '4.14.127+',
            codename: 'Core',
            name: 'CentOS Linux',
            family: 'redhat',
            version: '7 (Core)',
            platform: 'centos',
          },
          containerized: false,
          name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          architecture: 'x86_64',
        });
      }
    );

    apiTest('returns AWS host metadata for 8.0.0', async ({ apiClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGS_AND_METRICS_WITH_AWS_8_0_0);

      const response = await apiClient.post('api/infra/metadata', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          nodeId: 'ip-172-31-47-9.us-east-2.compute.internal',
          nodeType: 'host',
          timeRange: timeRange800withAws,
        },
      });

      expect(response).toHaveStatusCode(200);
      const metadata = response.body as InfraMetadata;
      expect(metadata.features).toHaveLength(19);
      expect(metadata.features.some((f) => f.name === 'aws.ec2')).toBe(true);
      expect(metadata.name).toBe('ip-172-31-47-9.us-east-2.compute.internal');
      expect(new Date(metadata.info?.timestamp ?? '').getTime()).toBeGreaterThan(
        timeRange800withAws.from
      );
      expect(new Date(metadata.info?.timestamp ?? '').getTime()).toBeLessThan(
        timeRange800withAws.to
      );
      expect(metadata.info?.cloud).toStrictEqual({
        availability_zone: 'us-east-2c',
        image: { id: 'ami-0d8f6eb4f641ef691' },
        instance: { id: 'i-011454f72559c510b' },
        provider: 'aws',
        machine: { type: 't2.micro' },
        region: 'us-east-2',
        account: { id: '015351775590' },
      });
      expect(metadata.info?.agent).toStrictEqual({
        hostname: 'ip-172-31-47-9.us-east-2.compute.internal',
        id: 'd0943b36-d0d3-426d-892b-7d79c071b44b',
        ephemeral_id: '64c94244-88b8-4a37-adc0-30428fefaf53',
        type: 'metricbeat',
        version: '8.0.0',
      });
      expect(metadata.info?.host).toStrictEqual({
        hostname: 'ip-172-31-47-9.us-east-2.compute.internal',
        os: {
          kernel: '4.14.123-111.109.amzn2.x86_64',
          codename: 'Karoo',
          name: 'Amazon Linux',
          family: 'redhat',
          version: '2',
          platform: 'amzn',
        },
        containerized: false,
        name: 'ip-172-31-47-9.us-east-2.compute.internal',
        id: 'ded64cbff86f478990a3dfbb63a8d238',
        architecture: 'x86_64',
      });
    });

    apiTest('returns pod metadata for 8.0.0', async ({ apiClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGS_AND_METRICS_WITH_AWS_8_0_0);

      const response = await apiClient.post('api/infra/metadata', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          nodeId: '14887487-99f8-11e9-9a96-42010a84004d',
          nodeType: 'pod',
          timeRange: timeRange800withAws,
        },
      });

      expect(response).toHaveStatusCode(200);
      const metadata = response.body as InfraMetadata;
      expect(metadata.features).toHaveLength(29);
      // With this data set the `kubernetes.pod.name` fields have been removed.
      expect(metadata.name).toBe('fluentd-gcp-v3.2.0-np7vw');
      expect(new Date(metadata.info?.timestamp ?? '').getTime()).toBeGreaterThan(
        timeRange800withAws.from
      );
      expect(new Date(metadata.info?.timestamp ?? '').getTime()).toBeLessThan(
        timeRange800withAws.to
      );
      expect(metadata.info?.cloud).toStrictEqual({
        instance: {
          id: '6613144177892233360',
          name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
        },
        provider: 'gcp',
        availability_zone: 'europe-west1-c',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          id: 'elastic-observability',
        },
      });
      expect(metadata.info?.agent).toStrictEqual({
        hostname: 'gke-observability-8--observability-8--bc1afd95-ngmh',
        id: '66dc19e6-da36-49d2-9471-2c9475503178',
        ephemeral_id: 'a0c3a9ff-470a-41a0-bf43-d1af6b7a3b5b',
        type: 'metricbeat',
        version: '8.0.0',
      });
      expect(metadata.info?.host).toStrictEqual({
        hostname: 'gke-observability-8--observability-8--bc1afd95-ngmh',
        name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
        os: {
          codename: 'Core',
          family: 'redhat',
          kernel: '4.14.127+',
          name: 'CentOS Linux',
          platform: 'centos',
          version: '7 (Core)',
        },
        architecture: 'x86_64',
        containerized: false,
      });
    });

    apiTest('returns container metadata for 8.0.0', async ({ apiClient, esArchiver }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGS_AND_METRICS_WITH_AWS_8_0_0);

      const response = await apiClient.post('api/infra/metadata', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          nodeId: 'c74b04834c6d7cc1800c3afbe31d0c8c0c267f06e9eb45c2b0c2df3e6cee40c5',
          nodeType: 'container',
          timeRange: timeRange800withAws,
        },
      });

      expect(response).toHaveStatusCode(200);
      const metadata = response.body as InfraMetadata;
      expect(metadata.features).toHaveLength(26);
      expect(new Date(metadata.info?.timestamp ?? '').getTime()).toBeGreaterThan(
        timeRange800withAws.from
      );
      expect(new Date(metadata.info?.timestamp ?? '').getTime()).toBeLessThan(
        timeRange800withAws.to
      );
      expect(metadata.name).toBe(
        'k8s_prometheus-to-sd-exporter_fluentd-gcp-v3.2.0-w68r5_kube-system_26950cde-9aed-11e9-9a96-42010a84004d_0'
      );
      expect(metadata.info?.cloud).toStrictEqual({
        instance: {
          id: '4039094952262994102',
          name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
        },
        provider: 'gcp',
        availability_zone: 'europe-west1-c',
        machine: {
          type: 'n1-standard-4',
        },
        project: {
          id: 'elastic-observability',
        },
      });
      expect(metadata.info?.agent).toStrictEqual({
        hostname: 'gke-observability-8--observability-8--bc1afd95-nhhw',
        id: 'c58a514c-e971-4590-8206-385400e184dd',
        ephemeral_id: 'e9d46cb0-2e89-469d-bd3b-6f32d7c96cc0',
        type: 'metricbeat',
        version: '8.0.0',
      });
      expect(metadata.info?.host).toStrictEqual({
        hostname: 'gke-observability-8--observability-8--bc1afd95-nhhw',
        name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
        os: {
          codename: 'Core',
          family: 'redhat',
          kernel: '4.14.127+',
          name: 'CentOS Linux',
          platform: 'centos',
          version: '7 (Core)',
        },
        architecture: 'x86_64',
        containerized: false,
      });
    });
  }
);
