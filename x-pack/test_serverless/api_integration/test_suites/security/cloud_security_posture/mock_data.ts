/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';

const chance = new Chance();

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
}

export interface MockTelemetryData {
  [key: string]: MockTelemetryFindings[];
}

export const telemetryMockData: MockTelemetryData = {
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
};

export const findingsMockData = [
  {
    resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
    result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
    rule: {
      name: 'Upper case rule name',
      section: 'Upper case section',
      benchmark: {
        id: 'cis_k8s',
        posture_type: 'kspm',
        name: 'CIS Kubernetes V1.23',
        version: 'v1.0.0',
      },
      type: 'process',
    },
    cluster_id: 'Upper case cluster id',
  },
  {
    resource: { id: chance.guid(), name: `Pod`, sub_type: 'Upper case sub type' },
    result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
    rule: {
      name: 'lower case rule name',
      section: 'Another upper case section',
      benchmark: {
        id: 'cis_aws',
        posture_type: 'cspm',
        name: 'CIS Kubernetes V1.23',
        version: 'v1.0.0',
      },
      type: 'process',
    },
    cluster_id: 'Another Upper case cluster id',
  },
];

export const vulnerabilityMockData = [
  {
    resource: {
      name: 'NameNama',
      id: '12345',
    },
    vulnerability: {
      severity: 'MEDIUM',
      package: {
        name: 'github.com/aws/aws-sdk-go',
        version: 'v1.42.30',
      },
    },
    cvss: {
      redhat: {
        V3Vector: 'CVSS:3.1/AV:L/AC:H/PR:L/UI:N/S:C/C:H/I:N/A:N',
        V3Score: 5.6,
      },
    },
  },
];
