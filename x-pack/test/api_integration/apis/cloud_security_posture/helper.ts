/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent as SuperTestAgent } from 'supertest';
import { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { IndexDetails } from '@kbn/cloud-security-posture-plugin/common/types_old';
import { CLOUD_SECURITY_PLUGIN_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import { SecurityService } from '../../../../../test/common/services/security/security';

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
  supertest: SuperTestAgent,
  agentPolicyId: string,
  policyTemplate: string,
  input: string,
  deployment: string,
  posture: string,
  packageName: string = 'cloud_security_posture-1'
) {
  const version = CLOUD_SECURITY_PLUGIN_VERSION;
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
    .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
    .set('kbn-xsrf', 'xxxx')
    .send({
      force: true,
      name: packageName,
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

export const createUser = async (security: SecurityService, userName: string, roleName: string) => {
  await security.user.create(userName, {
    password: 'changeme',
    roles: [roleName],
    full_name: 'a reporting user',
  });
};

export const createCSPOnlyRole = async (
  security: SecurityService,
  roleName: string,
  indicesName: string
) => {
  await security.role.create(roleName, {
    kibana: [
      {
        feature: { siem: ['read'], fleetv2: ['all'], fleet: ['read'] },
        spaces: ['*'],
      },
    ],
    ...(indicesName.length !== 0
      ? {
          elasticsearch: {
            indices: [
              {
                names: [indicesName],
                privileges: ['read'],
              },
            ],
          },
        }
      : {}),
  });
};

export const deleteRole = async (security: SecurityService, roleName: string) => {
  await security.role.delete(roleName);
};

export const deleteUser = async (security: SecurityService, userName: string) => {
  await security.user.delete(userName);
};

export const assertIndexStatus = (
  indicesDetails: IndexDetails[],
  indexName: string,
  expectedStatus: string
) => {
  const actualValue = indicesDetails.find((idx) => idx.index === indexName)?.status;
  expect(actualValue).to.eql(
    expectedStatus,
    `expected ${indexName} status to be ${expectedStatus} but got  ${actualValue} instead`
  );
};
