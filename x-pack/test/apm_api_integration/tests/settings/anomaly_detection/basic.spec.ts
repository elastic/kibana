/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ApmApiError } from '../../../common/apm_api_supertest';

export default function apiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  type SupertestAsUser =
    | typeof apmApiClient.readUser
    | typeof apmApiClient.writeUser
    | typeof apmApiClient.noAccessUser;

  function getJobs(user: SupertestAsUser) {
    return user({ endpoint: `GET /internal/apm/settings/anomaly-detection/jobs` });
  }

  function createJobs(user: SupertestAsUser, environments: string[]) {
    return user({
      endpoint: 'POST /internal/apm/settings/anomaly-detection/jobs',
      params: {
        body: { environments },
      },
    });
  }

  async function expectForbidden(user: SupertestAsUser) {
    try {
      await getJobs(user);
      expect(true).to.be(false);
    } catch (e) {
      const err = e as ApmApiError;
      expect(err.res.status).to.be(403);
    }

    try {
      await createJobs(user, ['production', 'staging']);
      expect(true).to.be(false);
    } catch (e) {
      const err = e as ApmApiError;
      expect(err.res.status).to.be(403);
    }
  }

  registry.when('ML jobs return a 403 for', { config: 'basic', archives: [] }, () => {
    it('user without access', async () => {
      await expectForbidden(apmApiClient.noAccessUser);
    });

    it('read user', async () => {
      await expectForbidden(apmApiClient.readUser);
    });

    it('write user', async () => {
      await expectForbidden(apmApiClient.writeUser);
    });
  });
}
