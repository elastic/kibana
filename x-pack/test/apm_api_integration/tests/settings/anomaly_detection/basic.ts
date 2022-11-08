/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function apiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const noAccessUser = getService('legacySupertestAsNoAccessUser');
  const readUser = getService('legacySupertestAsApmReadUser');
  const writeUser = getService('legacySupertestAsApmWriteUser');

  type SupertestAsUser = typeof noAccessUser | typeof readUser | typeof writeUser;

  function getJobs(user: SupertestAsUser) {
    return user.get(`/internal/apm/settings/anomaly-detection/jobs`).set('kbn-xsrf', 'foo');
  }

  function createJobs(user: SupertestAsUser, environments: string[]) {
    return user
      .post(`/internal/apm/settings/anomaly-detection/jobs`)
      .send({ environments })
      .set('kbn-xsrf', 'foo');
  }

  async function expectForbidden(user: SupertestAsUser) {
    const { body: getJobsBody } = await getJobs(user);
    expect(getJobsBody.statusCode).to.be(403);
    expect(getJobsBody.error).to.be('Forbidden');

    const { body: createJobsBody } = await createJobs(user, ['production', 'staging']);

    expect(createJobsBody.statusCode).to.be(403);
    expect(getJobsBody.error).to.be('Forbidden');
  }

  registry.when('ML jobs return a 403 for', { config: 'basic', archives: [] }, () => {
    it('user without access', async () => {
      await expectForbidden(noAccessUser);
    });

    it('read user', async () => {
      await expectForbidden(readUser);
    });

    it('write user', async () => {
      await expectForbidden(writeUser);
    });
  });
}
