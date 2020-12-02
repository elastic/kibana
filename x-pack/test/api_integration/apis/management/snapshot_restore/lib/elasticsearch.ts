/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

interface SlmPolicy {
  name: string;
  snapshotName: string;
  schedule: string;
  repository: string;
  isManagedPolicy: boolean;
  config?: {
    indices?: string | string[];
    ignoreUnavailable?: boolean;
    includeGlobalState?: boolean;
    partial?: boolean;
    metadata?: Record<string, string>;
  };
  retention?: {
    expireAfterValue?: number | '';
    expireAfterUnit?: string;
    maxCount?: number | '';
    minCount?: number | '';
  };
}

/**
 * Helpers to create and delete SLM policies on the Elasticsearch instance
 * during our tests.
 * @param {ElasticsearchClient} es The Elasticsearch client instance
 */
export const registerEsHelpers = (getService: FtrProviderContext['getService']) => {
  let policiesCreated: string[] = [];

  const es = getService('legacyEs');

  const createRepository = (repoName: string) => {
    return es.snapshot.createRepository({
      repository: repoName,
      body: {
        type: 'fs',
        settings: {
          location: '/tmp/',
        },
      },
      verify: false,
    });
  };

  const createPolicy = (policy: SlmPolicy, cachePolicy?: boolean) => {
    if (cachePolicy) {
      policiesCreated.push(policy.name);
    }

    return es.sr.updatePolicy({
      name: policy.name,
      body: policy,
    });
  };

  const getPolicy = (policyName: string) => {
    return es.sr.policy({
      name: policyName,
      human: true,
    });
  };

  const deletePolicy = (policyName: string) => es.sr.deletePolicy({ name: policyName });

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
    createRepository,
    createPolicy,
    deletePolicy,
    cleanupPolicies,
    getPolicy,
  };
};
