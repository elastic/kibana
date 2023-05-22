/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuperTest, Test } from 'supertest';
import { Client } from '@elastic/elasticsearch';

export const deleteIndex = (es: Client, indexToBeDeleted: string[]) => {
  Promise.all([
    ...indexToBeDeleted.map((indexes) =>
      es.deleteByQuery({
        index: indexes,
        query: {
          match_all: {},
        },
        ignore_unavailable: true,
        refresh: true,
      })
    ),
  ]);
};

export const addIndex = async <T>(es: Client, findingsMock: T[], indexName: string) => {
  await Promise.all([
    ...findingsMock.map((finding) =>
      es.index({
        index: indexName,
        body: {
          ...finding,
          '@timestamp': new Date().toISOString(),
        },
        refresh: true,
      })
    ),
  ]);
};

export async function createPackagePolicy(
  supertest: SuperTest<Test>,
  agentPolicyId: string,
  policyTemplate: string,
  input: string,
  deployment: string,
  posture: string
) {
  const version = posture === 'kspm' || posture === 'cspm' ? '1.2.8' : '1.3.0-preview2';
  const title = 'Security Posture Management';
  const streams = [
    {
      enabled: false,
      data_stream: {
        type: 'logs',
        dataset: 'cloud_security_posture.vulnerabilities',
      },
    },
  ];

  const inputTemplate = {
    enabled: true,
    type: input,
    policy_template: policyTemplate,
  };

  const inputs = posture === 'vuln_mgmt' ? { ...inputTemplate, streams } : { ...inputTemplate };

  const { body: postPackageResponse } = await supertest
    .post(`/api/fleet/package_policies`)
    .set('kbn-xsrf', 'xxxx')
    .send({
      force: true,
      name: 'cloud_security_posture-1',
      description: '',
      namespace: 'default',
      policy_id: agentPolicyId,
      enabled: true,
      inputs: [inputs],
      package: {
        name: 'cloud_security_posture',
        title,
        version,
      },
      vars: {
        deployment: {
          value: deployment,
          type: 'text',
        },
        posture: {
          value: posture,
          type: 'text',
        },
      },
    })
    .expect(200);

  return postPackageResponse.item;
}
