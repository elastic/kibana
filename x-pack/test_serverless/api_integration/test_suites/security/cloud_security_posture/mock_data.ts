/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';

const chance = new Chance();

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
    event: {
      ingested: '2023-08-19T18:20:41Z',
      created: '2023-08-19T18:17:15.609124281Z',
    },
    data_stream: {
      dataset: 'cloud_security_posture.findings',
    },
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
    event: {
      ingested: '2023-08-19T18:20:41Z',
      created: '2023-08-19T18:17:15.609124281Z',
    },
    data_stream: {
      dataset: 'cloud_security_posture.findings',
    },
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
