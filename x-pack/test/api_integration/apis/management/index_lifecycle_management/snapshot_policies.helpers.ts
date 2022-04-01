/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_BASE_PATH, SNAPSHOT_REPOSITORY_NAME } from './constants';

export const registerSnapshotPoliciesHelpers = (getService: FtrProviderContext['getService']) => {
  const supertest = getService('supertest');
  const es = getService('es');

  let policiesCreated: string[] = [];

  const loadSnapshotPolicies = () => supertest.get(`${API_BASE_PATH}/snapshot_policies`);

  const createSnapshotPolicy = (policyName: string, repositoryName?: string) => {
    return es.slm
      .putLifecycle({
        policy_id: policyName,
        config: {
          indices: 'test_index',
        },
        name: policyName,
        repository: repositoryName ?? SNAPSHOT_REPOSITORY_NAME,
        schedule: '0 30 1 * * ?',
      })
      .then(() => policiesCreated.push(policyName));
  };

  const deletePolicy = (policyName: string) => es.slm.deleteLifecycle({ policy_id: policyName });

  const cleanupPolicies = () =>
    Promise.all(policiesCreated.map(deletePolicy))
      .then(() => {
        policiesCreated = [];
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });

  return {
    loadSnapshotPolicies,
    createSnapshotPolicy,
    cleanupPolicies,
  };
};
