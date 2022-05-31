/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { registerSnapshotPoliciesHelpers } from './snapshot_policies.helpers';
import { registerSnapshotRepositoriesHelpers } from './snapshot_repositories.helpers';
import { SNAPSHOT_REPOSITORY_NAME } from './constants';

const snapshotPolicyName = 'test_snapshot_policy';
export default function ({ getService }: FtrProviderContext) {
  const deployment = getService('deployment');

  const { loadSnapshotPolicies, createSnapshotPolicy, cleanupPolicies } =
    registerSnapshotPoliciesHelpers(getService);

  const { createSnapshotRepository, cleanupRepositories } =
    registerSnapshotRepositoriesHelpers(getService);

  describe('snapshot policies', () => {
    before(async () => Promise.all([cleanupPolicies(), cleanupRepositories()]));
    after(async () => Promise.all([cleanupPolicies(), cleanupRepositories()]));

    it('returns empty array if no policies', async () => {
      const { body } = await loadSnapshotPolicies().expect(200);
      expect(body).to.eql([]);
    });

    it('returns policies', async () => {
      const isCloud = await deployment.isCloud();
      if (!isCloud) {
        await createSnapshotRepository(SNAPSHOT_REPOSITORY_NAME);
      }
      await createSnapshotPolicy(snapshotPolicyName);
      const { body } = await loadSnapshotPolicies().expect(200);

      expect(body).to.have.length(1);
      expect(body[0]).to.eql(snapshotPolicyName);
    });
  });
}
