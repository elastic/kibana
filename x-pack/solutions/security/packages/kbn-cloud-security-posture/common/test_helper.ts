/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Agent as SuperTestAgent } from 'supertest';

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { CLOUD_SECURITY_PLUGIN_VERSION } from './constants';

export async function createPackagePolicy(
  supertest: SuperTestAgent,
  agentPolicyId: string,
  policyTemplate: string,
  input: string,
  deployment: string,
  posture: string,
  packageName: string = 'cloud_security_posture-1',
  roleAuthc?: RoleCredentials,
  internalRequestHeader?: { 'x-elastic-internal-origin': string; 'kbn-xsrf': string }
) {
  const version = CLOUD_SECURITY_PLUGIN_VERSION;
  const title = 'Security Posture Management';
  const streams = [
    {
      enabled: true,
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

  const { body: postPackageResponse } =
    roleAuthc && internalRequestHeader
      ? await supertest
          .post(`/api/fleet/package_policies`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .set(internalRequestHeader)
          .set(roleAuthc.apiKeyHeader)
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
          .expect(200)
      : await supertest
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
