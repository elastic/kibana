/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import expect from '@kbn/expect';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { ToolingLog } from '@kbn/tooling-log';
import supertest, { SuperTest, Test } from 'supertest';

export async function createPackagePolicy(
  httpClient: SuperTest<Test>,
  agentPolicyId: string,
  policyTemplate: string,
  input: string,
  deployment: string,
  posture: string,
  packageName: string = 'cloud_security_posture-1'
) {
  const version = '1.7.1';
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

  const { body: postPackageResponse } = await httpClient
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
// Todo: call setupCSPPackage in ProviderContext for tests
export const setupCSPPackage = async (
  retry: RetryService,
  log: ToolingLog,
  httpClient: supertest.SuperTest<supertest.Test>
) => {
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await httpClient
        .get('/internal/cloud_security_posture/status?check=init')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  return waitForPluginInitialized;
};
