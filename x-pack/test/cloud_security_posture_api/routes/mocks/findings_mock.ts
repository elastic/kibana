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
    '@timestamp': '2023-06-29T02:08:44.993Z',
    resource: {
      id: chance.guid(),
      name: `kubelet`,
      sub_type: 'lower case sub type',
      type: 'k8s_resource_type',
    },
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
    },
    orchestrator: {
      cluster: { id: 'Upper case cluster id' },
    },
    data_stream: {
      dataset: 'cloud_security_posture.findings',
    },
  },
  {
    '@timestamp': '2023-06-29T02:08:44.993Z',
    resource: {
      id: chance.guid(),
      name: `Pod`,
      sub_type: 'Upper case sub type',
      type: 'cloud_resource_type',
    },
    result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
    rule: {
      name: 'lower case rule name',
      section: 'Another upper case section',
      benchmark: {
        id: 'cis_aws',
        posture_type: 'cspm',
        name: 'CIS AWS2',
        version: 'v1.5.0',
      },
    },
    cloud: {
      account: { id: 'Another Upper case account id' },
    },
    data_stream: {
      dataset: 'cloud_security_posture.findings',
    },
  },
];
