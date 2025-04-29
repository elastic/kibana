/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import type { ApmApiError } from '../../../../../services/apm_api';

export default function apiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');

  type SupertestAsUser = typeof apmApiClient.readUser | typeof apmApiClient.writeUser;

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
    } catch (e) {
      const err = e as ApmApiError;
      expect(err.res.status).to.be(403);
    }

    try {
      await createJobs(user, ['production', 'staging']);
    } catch (e) {
      const err = e as ApmApiError;
      expect(err.res.status).to.be(403);
    }
  }

  describe('ML jobs return a 403 for', () => {
    describe('basic', function () {
      it('read user', async () => {
        await expectForbidden(apmApiClient.readUser);
      });

      it('write user', async () => {
        await expectForbidden(apmApiClient.writeUser);
      });
    });
  });
}
