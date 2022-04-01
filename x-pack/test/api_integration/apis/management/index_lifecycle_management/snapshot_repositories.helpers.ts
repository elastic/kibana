/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_BASE_PATH } from './constants';

export const registerSnapshotRepositoriesHelpers = (
  getService: FtrProviderContext['getService']
) => {
  const supertest = getService('supertest');
  const es = getService('es');

  let repositoriesCreated: string[] = [];

  const loadSnapshotRepositories = () => supertest.get(`${API_BASE_PATH}/snapshot_repositories`);

  const createSnapshotRepository = (repositoryName: string) => {
    return es.snapshot
      .createRepository({
        name: repositoryName,
        body: {
          type: 'fs',
          settings: {
            location: '/tmp/repo',
          },
        },
        verify: false,
      })
      .then(() => repositoriesCreated.push(repositoryName));
  };

  const deleteRepository = (repositoryName: string) => {
    return es.snapshot.deleteRepository({ name: repositoryName });
  };

  const cleanupRepositories = () =>
    Promise.all(repositoriesCreated.map(deleteRepository))
      .then(() => {
        repositoriesCreated = [];
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });

  return {
    loadSnapshotRepositories,
    createSnapshotRepository,
    cleanupRepositories,
  };
};
