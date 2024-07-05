/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Chance from 'chance';

const chance = new Chance();

export const FINDINGS_WITH_RULES = [
  {
    '@timestamp': new Date().toISOString(),
    resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
    result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
    rule: {
      tags: ['CIS', 'CIS K8S'],
      rationale: 'rationale steps for rule 1.1',
      references: '1. https://elastic.co/rules/1.1',
      name: 'Upper case rule name',
      section: 'Upper case section',
      benchmark: {
        rule_number: '1.1',
        id: 'cis_k8s',
        posture_type: 'kspm',
        name: 'CIS Kubernetes V1.23',
        version: 'v1.0.0',
        remediation: 'remediation guide',
      },
      type: 'process',
    },
    cluster_id: 'Upper case cluster id',
  },
  {
    '@timestamp': new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    resource: { id: chance.guid(), name: `Pod`, sub_type: 'Upper case sub type' },
    result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
    rule: {
      tags: ['CIS', 'CIS K8S'],
      rationale: 'rationale steps',
      references: '1. https://elastic.co',
      name: 'lower case rule name',
      section: 'Another upper case section',
      benchmark: {
        rule_number: '1.2',
        id: 'cis_k8s',
        posture_type: 'kspm',
        name: 'CIS Kubernetes V1.23',
        version: 'v1.0.0',
        remediation: 'remediation guide',
      },
      type: 'process',
    },
    cluster_id: 'Another Upper case cluster id',
  },
  {
    '@timestamp': new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    resource: { id: chance.guid(), name: `process`, sub_type: 'another lower case type' },
    result: { evaluation: 'passed' },
    rule: {
      tags: ['CIS', 'CIS K8S'],
      rationale: 'rationale steps',
      references: '1. https://elastic.co',
      name: 'Another upper case rule name',
      section: 'lower case section',
      benchmark: {
        rule_number: '1.3',
        id: 'cis_k8s',
        posture_type: 'kspm',
        name: 'CIS Kubernetes V1.23',
        version: 'v1.0.0',
        remediation: 'remediation guide',
      },
      type: 'process',
    },
    cluster_id: 'lower case cluster id',
  },
  {
    '@timestamp': new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    resource: { id: chance.guid(), name: `process`, sub_type: 'Upper case type again' },
    result: { evaluation: 'failed' },
    rule: {
      tags: ['CIS', 'CIS K8S'],
      rationale: 'rationale steps',
      references: '1. https://elastic.co',
      name: 'some lower case rule name',
      section: 'another lower case section',
      benchmark: {
        rule_number: '1.4',
        id: 'cis_k8s',
        posture_type: 'kspm',
        name: 'CIS Kubernetes V1.23',
        version: 'v1.0.0',
        remediation: 'remediation guide',
      },
      type: 'process',
    },
    cluster_id: 'another lower case cluster id',
  },
];
