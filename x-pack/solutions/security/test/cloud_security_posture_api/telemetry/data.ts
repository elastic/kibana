/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MockTelemetryFindings {
  rule: {
    benchmark: { id: string; posture_type?: string | undefined; version: string; name: string };
  };
  resource: { type: string; sub_type: string; id: string };
  agent: { id: string };
  result: { evaluation: string };
  host: { name: string };
  cluster_id?: string;
  cloud?: { account?: { id: string } };
  cloudbeat?: { kubernetes: { version: string } };
  data_stream?: { namespace: string };
}

export interface MockCloudConnector {
  id: string;
  created_at: string;
  updated_at: string;
  cloudProvider: string;
  vars: Record<string, any>;
}

export interface MockTelemetryData {
  [key: string]: MockTelemetryFindings[] | MockCloudConnector[];
}

export const data: MockTelemetryData = {
  cspmFindings: [
    {
      rule: {
        benchmark: {
          id: 'cis_aws',
          posture_type: 'cspm',
          version: 'v1.5.0',
          name: 'CIS Amazon Web Services Foundations',
        },
      },
      resource: {
        type: 'identifyingType',
        sub_type: 'aws-password-policy',
        id: '15e450b7-8980-5bca-ade2-a0c795f9ea9d',
      },
      agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae2' },
      result: { evaluation: 'failed' },
      cloud: { account: { id: 'my-aws-12345' } },
      host: { name: 'docker-fleet-agent' },
      data_stream: { namespace: 'default' },
    },
    {
      rule: {
        benchmark: {
          id: 'cis_aws',
          posture_type: 'cspm',
          version: 'v1.5.0',
          name: 'CIS Amazon Web Services Foundations',
        },
      },
      resource: {
        type: 'identifyingType',
        sub_type: 'aws-password-policy',
        id: '15e450b7-8980-5bca-ade2-a0c795f9ea99',
      },
      agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae2' },
      result: { evaluation: 'passed' },
      cloud: { account: { id: 'my-aws-12345' } },
      host: { name: 'docker-fleet-agent' },
      data_stream: { namespace: 'default' },
    },
  ],
  kspmFindings: [
    {
      cluster_id: 'my-k8s-cluster-5555',
      rule: {
        benchmark: {
          id: 'cis_k8s',
          version: 'v1.0.0',
          name: 'CIS Kubernetes V1.23',
          posture_type: 'kspm',
        },
      },
      resource: {
        type: 'k8s_object',
        sub_type: 'ServiceAccount',
        id: '1111',
      },
      agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae2' },
      result: { evaluation: 'passed' },
      host: { name: 'docker-fleet-agent' },
      cloudbeat: { kubernetes: { version: 'v1.23.0' } },
      data_stream: { namespace: 'default' },
    },
    {
      cluster_id: 'my-k8s-cluster-5555',
      rule: {
        benchmark: {
          id: 'cis_k8s',
          version: 'v1.0.0',
          name: 'CIS Kubernetes V1.23',
          posture_type: 'kspm',
        },
      },
      resource: {
        type: 'process',
        sub_type: 'process',
        id: '1111',
      },
      agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae3' },
      result: { evaluation: 'passed' },
      host: { name: 'control-plane' },
      cloudbeat: { kubernetes: { version: 'v1.23.0' } },
      data_stream: { namespace: 'default' },
    },
  ],
  kspmFindingsNoPostureType: [
    {
      cluster_id: 'my-k8s-cluster-5555',
      rule: {
        benchmark: {
          id: 'cis_k8s',
          version: 'v1.0.0',
          name: 'CIS Kubernetes V1.23',
        },
      },
      resource: {
        type: 'k8s_object',
        sub_type: 'ServiceAccount',
        id: '1111',
      },
      agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae2' },
      result: { evaluation: 'passed' },
      host: { name: 'docker-fleet-agent' },
      cloudbeat: { kubernetes: { version: 'v1.23.0' } },
    },
    {
      cluster_id: 'my-k8s-cluster-5555',
      rule: {
        benchmark: {
          id: 'cis_k8s',
          version: 'v1.0.0',
          name: 'CIS Kubernetes V1.23',
        },
      },
      resource: {
        type: 'process',
        sub_type: 'process',
        id: '1111',
      },
      agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae3' },
      result: { evaluation: 'passed' },
      host: { name: 'control-plane' },
      cloudbeat: { kubernetes: { version: 'v1.23.0' } },
    },
  ],
  cloudConnectors: [
    {
      id: 'cloud-connector-aws-1',
      created_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-20T15:30:00.000Z',
      cloudProvider: 'aws',
      vars: {
        role_arn: { value: 'arn:aws:iam::123456789012:role/CloudConnectorRole' },
        external_id: { value: 'external-id-123' },
      },
    },
    {
      id: 'cloud-connector-azure-1',
      created_at: '2024-01-16T11:00:00.000Z',
      updated_at: '2024-01-21T16:30:00.000Z',
      cloudProvider: 'azure',
      vars: {
        client_id: { value: 'azure-client-id-456' },
        tenant_id: { value: 'azure-tenant-id-789' },
        azure_cloud_connector_id: { value: 'azure-connector-id-101' },
      },
    },
    {
      id: 'cloud-connector-aws-2',
      created_at: '2024-01-17T12:00:00.000Z',
      updated_at: '2024-01-22T17:30:00.000Z',
      cloudProvider: 'aws',
      vars: {
        role_arn: { value: 'arn:aws:iam::987654321098:role/AnotherRole' },
        // Missing external_id - should show hasCredentials: false
      },
    },
  ],
};
