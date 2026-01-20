/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import type { Client } from '@elastic/elasticsearch';
import { RetryService } from '@kbn/ftr-common-functional-services';

interface MoveIndexToFrozenDataTierResult {
  snapshotRepositoryName: string;
  newIndexName: string;
  ilmPolicyName: string;
}

interface MoveIndexToFrozenDataTierParams {
  es: Client;
  retry: RetryService;
  index: string;
}

export const moveIndexToFrozenDataTier = async ({
  es,
  index,
  retry,
}: MoveIndexToFrozenDataTierParams): Promise<MoveIndexToFrozenDataTierResult> => {
  // Create a snapshot repository
  const snapshotName = `frozen-data-tier-snapshot-${uuidv4()}`;
  await es.snapshot.createRepository({
    name: snapshotName,
    repository: {
      type: 'fs',
      settings: {
        location: '/tmp',
      },
    },
  });

  // Verify snapshot repository is working
  await es.snapshot.verifyRepository({
    name: snapshotName,
  });

  // Create an ilm policy that moves the index to frozen after 0 days
  const ilmPolicyName = `frozen-ilm-${uuidv4()}`;
  await es.ilm.putLifecycle({
    name: ilmPolicyName,
    policy: {
      phases: {
        hot: {
          actions: {
            set_priority: {
              priority: 100,
            },
          },
          min_age: '0ms',
        },
        frozen: {
          min_age: '0d',
          actions: {
            searchable_snapshot: {
              snapshot_repository: snapshotName,
            },
          },
        },
      },
    },
  });

  // Attach the policy to the test index
  await es.indices.putSettings({
    index,
    settings: {
      'index.lifecycle.name': ilmPolicyName,
    },
  });

  const newIndexName = `partial-${index}`;

  await retry.try(async () => {
    const response = await es.ilm.explainLifecycle({
      index,
      filter_path: 'indices.*.phase,indices.*.step,indices.*.managed',
    });
    const indexInfo = response.indices[newIndexName];
    expect(indexInfo).to.not.be(undefined);
    expect(indexInfo.managed && indexInfo.phase).to.be.equal('frozen');
    expect(indexInfo.managed && indexInfo.step).to.be.equal('complete');
  });

  return {
    snapshotRepositoryName: snapshotName,
    newIndexName,
    ilmPolicyName,
  };
};
