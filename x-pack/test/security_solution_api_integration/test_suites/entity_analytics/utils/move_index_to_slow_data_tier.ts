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
import { ToolingLog } from '@kbn/tooling-log';

const TIMEOUT_MS: number = 300000; // 5 minutes

interface MoveIndexToSlowDataTierResult {
  snapshotRepositoryName: string;
  newIndexName: string;
  ilmPolicyName: string;
}

interface MoveIndexToSlowDataTierParams {
  es: Client;
  retry: RetryService;
  log: ToolingLog;
  index: string;
  tier: 'cold' | 'frozen';
}

export const moveIndexToSlowDataTier = async ({
  es,
  index,
  retry,
  tier,
  log,
}: MoveIndexToSlowDataTierParams): Promise<MoveIndexToSlowDataTierResult> => {
  // Create a snapshot repository
  const snapshotName = `${tier}-data-tier-snapshot-${uuidv4()}`;
  await es.snapshot.createRepository({
    name: snapshotName,
    repository: {
      type: 'fs',
      settings: {
        location: `/tmp/${tier}`,
      },
    },
  });

  // Verify snapshot repository is working
  await es.snapshot.verifyRepository({
    name: snapshotName,
  });

  // Create an ilm policy that moves the index to frozen after 0 days
  const ilmPolicyName = `${tier}-ilm-${uuidv4()}`;
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
        [tier]: {
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

  const partialIndexName = `partial-${index}`;
  const restoredIndexName = `restored-${index}`;
  let newIndexName = '';

  await retry.waitForWithTimeout('Wait lifecycle to be completed', TIMEOUT_MS, async () => {
    const response = await es.ilm.explainLifecycle({
      index,
      filter_path: 'indices.*.phase,indices.*.step,indices.*.managed',
    });

    if (!!response.indices[partialIndexName]) {
      newIndexName = partialIndexName;
    }

    if (!!response.indices[restoredIndexName]) {
      newIndexName = restoredIndexName;
    }

    const indexInfo = response.indices[newIndexName];

    log.debug(`INDEX INFO ${JSON.stringify(response)}`);

    expect(indexInfo).to.not.be(undefined);
    expect(indexInfo.managed && indexInfo.phase).to.be.equal(tier);
    expect(indexInfo.managed && indexInfo.step).to.be.equal('complete');
    return true;
  });

  return {
    snapshotRepositoryName: snapshotName,
    newIndexName,
    ilmPolicyName,
  };
};
