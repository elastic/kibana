/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import supertest from 'supertest';
import { format as formatUrl } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

// It is wrapper around supertest that injects Serverless auth headers
export async function SecuritySolutionServerlessSuperTest({ getService }: FtrProviderContext) {
  // TODO delete the log
  // eslint-disable-next-line no-console
  console.log('------------------ SecuritySolutionServerlessSuperTest ------------------');

  const config = getService('config');

  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });

  const svlUserManager = getService('svlUserManager');
  const adminRoleAuthc = await svlUserManager.createApiKeyForRole('admin');

  const svlCommonApi = getService('svlCommonApi');
  const commonRequestHeader = svlCommonApi.getCommonRequestHeader();

  return supertest.agent(kbnUrl).set(commonRequestHeader).set(adminRoleAuthc.apiKeyHeader);
}
