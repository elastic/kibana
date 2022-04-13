/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { registerSnapshotRepositoriesHelpers } from './snapshot_repositories.helpers';
import { CLOUD_REPOSITORY_NAME } from './constants';

const repositoryName = 'test_repository';

export default function ({ getService }: FtrProviderContext) {
  const deployment = getService('deployment');
  let isCloud: boolean;

  const { loadSnapshotRepositories, createSnapshotRepository, cleanupRepositories } =
    registerSnapshotRepositoriesHelpers(getService);

  describe('snapshot repositories', () => {
    before(async () => {
      isCloud = await deployment.isCloud();
      await Promise.all([cleanupRepositories()]);
    });
    after(async () => Promise.all([cleanupRepositories()]));

    it('returns empty array if no repositories ', async () => {
      const {
        body: { repositories },
      } = await loadSnapshotRepositories().expect(200);
      if (!isCloud) {
        expect(repositories).to.eql([]);
      }
    });

    it('returns cloud default repository if on Cloud', async () => {
      const {
        body: { repositories },
      } = await loadSnapshotRepositories().expect(200);
      if (isCloud) {
        expect(repositories).to.have.length(1);
        expect(repositories).to.eql([CLOUD_REPOSITORY_NAME]);
      }
    });

    it('returns repositories', async () => {
      await createSnapshotRepository(repositoryName);
      const {
        body: { repositories },
      } = await loadSnapshotRepositories().expect(200);

      if (isCloud) {
        expect(repositories).to.have.length(2);
        expect(repositories[0]).to.contain(repositoryName);
      } else {
        expect(repositories).to.have.length(1);
        expect(repositories[0]).to.eql(repositoryName);
      }
    });
  });
}
