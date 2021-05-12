/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

interface SlmPolicy {
  name: string;
  snapshotName: string;
  schedule: string;
  repository: string;
  isManagedPolicy: boolean;
  config?: {
    indices: string | string[];
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

  const es = getService('es');

  const createRepository = (repoName: string) => {
    return es.snapshot
      .createRepository({
        repository: repoName,
        body: {
          type: 'fs',
          settings: {
            location: '/tmp/',
          },
        },
        verify: false,
      })
      .then(({ body }) => body);
  };

  const createPolicy = (policy: SlmPolicy, cachePolicy?: boolean) => {
    if (cachePolicy) {
      policiesCreated.push(policy.name);
    }

    return es.slm
      .putLifecycle({
        policy_id: policy.name,
        // TODO: bring {@link SlmPolicy} in line with {@link PutSnapshotLifecycleRequest['body']}
        // @ts-expect-error
        body: policy,
      })
      .then(({ body }) => body);
  };

  const getPolicy = (policyName: string) => {
    return es.slm
      .getLifecycle({
        policy_id: policyName,
        human: true,
      })
      .then(({ body }) => body);
  };

  const deletePolicy = (policyName: string) =>
    es.slm.deleteLifecycle({ policy_id: policyName }).then(({ body }) => body);

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
