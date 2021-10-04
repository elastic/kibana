/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { registerEsHelpers, SlmPolicy } from './lib';
import { SnapshotDetails } from '../../../../../plugins/snapshot_restore/common/types';

const REPO_NAME_1 = 'test_repo_1';
const REPO_NAME_2 = 'test_repo_2';
const REPO_PATH_1 = '/tmp/repo_1';
const REPO_PATH_2 = '/tmp/repo_2';
const POLICY_NAME_1 = 'test_policy_1';
const POLICY_NAME_2 = 'test_policy_2';
const BATCH_SIZE_1 = 3;
const BATCH_SIZE_2 = 5;
const SNAPSHOT_COUNT = 10;
// API defaults used in the UI
const PAGE_INDEX = 0;
const PAGE_SIZE = 20;
const SORT_FIELD = 'startTimeInMillis';
const SORT_DIRECTION = 'desc';

interface ApiParams {
  pageIndex?: number;
  pageSize?: number;

  sortField?: string;
  sortDirection?: string;

  searchField?: string;
  searchValue?: string;
  searchMatch?: string;
  searchOperator?: string;
}
const getApiPath = ({
  pageIndex,
  pageSize,
  sortField,
  sortDirection,
  searchField,
  searchValue,
  searchMatch,
  searchOperator,
}: ApiParams): string => {
  let path = `/api/snapshot_restore/snapshots?sortField=${sortField ?? SORT_FIELD}&sortDirection=${
    sortDirection ?? SORT_DIRECTION
  }&pageIndex=${pageIndex ?? PAGE_INDEX}&pageSize=${pageSize ?? PAGE_SIZE}`;
  // all 4 parameters should be used at the same time to configure the correct search request
  if (searchField && searchValue && searchMatch && searchOperator) {
    path = `${path}&searchField=${searchField}&searchValue=${searchValue}&searchMatch=${searchMatch}&searchOperator=${searchOperator}`;
  }
  return path;
};
const getPolicyBody = (policy: Partial<SlmPolicy>): SlmPolicy => {
  return {
    policyName: 'test_policy',
    name: 'test_snapshot',
    schedule: '0 30 1 * * ?',
    repository: 'test_repo',
    isManagedPolicy: false,
    config: {
      indices: ['my_index'],
      ignoreUnavailable: true,
    },
    ...policy,
  };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const {
    createSnapshot,
    createRepository,
    createPolicy,
    executePolicy,
    cleanupPolicies,
    deleteSnapshots,
  } = registerEsHelpers(getService);

  describe('Snapshots', function () {
    this.tags(['skipCloud']); // file system repositories are not supported in cloud

    let snapshotName1: string;
    let snapshotName2: string;

    before(async () => {
      try {
        await createRepository(REPO_NAME_1, REPO_PATH_1);
        await createRepository(REPO_NAME_2, REPO_PATH_2);
        await createPolicy(
          getPolicyBody({
            policyName: POLICY_NAME_1,
            repository: REPO_NAME_1,
            name: 'backup_snapshot',
          }),
          true
        );
        await createPolicy(
          getPolicyBody({
            policyName: POLICY_NAME_2,
            repository: REPO_NAME_2,
            name: 'a_snapshot',
          }),
          true
        );
        ({ snapshot_name: snapshotName1 } = await executePolicy(POLICY_NAME_1));
        // a short timeout to let the 1st snapshot start, otherwise the sorting by start time might be flaky
        await new Promise((resolve) => setTimeout(resolve, 2000));
        ({ snapshot_name: snapshotName2 } = await executePolicy(POLICY_NAME_2));
        for (let i = 0; i < BATCH_SIZE_1; i++) {
          await createSnapshot(`another_snapshot_${i}`, REPO_NAME_1);
        }
        for (let i = 0; i < BATCH_SIZE_2; i++) {
          await createSnapshot(`xyz_snapshot_${i}`, REPO_NAME_2);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('[Setup error] Error creating snapshots');
        throw err;
      }
    });

    after(async () => {
      await cleanupPolicies();
      await deleteSnapshots(REPO_NAME_1);
      await deleteSnapshots(REPO_NAME_2);
    });

    describe('pagination', () => {
      it('returns pageSize number of snapshots', async () => {
        const pageSize = 7;
        const {
          body: { total, snapshots },
        } = await supertest
          .get(
            getApiPath({
              pageSize,
            })
          )
          .set('kbn-xsrf', 'xxx')
          .send();
        expect(total).to.eql(SNAPSHOT_COUNT);
        expect(snapshots.length).to.eql(pageSize);
      });

      it('returns next page of snapshots', async () => {
        const pageSize = 3;
        let pageIndex = 0;
        const {
          body: { snapshots: firstPageSnapshots },
        } = await supertest
          .get(
            getApiPath({
              pageIndex,
              pageSize,
            })
          )
          .set('kbn-xsrf', 'xxx')
          .send();

        const firstPageSnapshotName = firstPageSnapshots[0].snapshot;
        expect(firstPageSnapshots.length).to.eql(pageSize);

        pageIndex = 1;
        const {
          body: { snapshots: secondPageSnapshots },
        } = await supertest
          .get(
            getApiPath({
              pageIndex,
              pageSize,
            })
          )
          .set('kbn-xsrf', 'xxx')
          .send();

        const secondPageSnapshotName = secondPageSnapshots[0].snapshot;
        expect(secondPageSnapshots.length).to.eql(pageSize);
        expect(secondPageSnapshotName).to.not.eql(firstPageSnapshotName);
      });
    });

    describe('sorting', () => {
      it('sorts by snapshot name (asc)', async () => {
        const {
          body: { snapshots },
        } = await supertest
          .get(
            getApiPath({
              sortField: 'snapshot',
              sortDirection: 'asc',
            })
          )
          .set('kbn-xsrf', 'xxx')
          .send();
        const snapshotName = snapshots[0].snapshot;
        expect(snapshotName).to.eql(snapshotName2);
      });

      it('sorts by snapshot name (desc)', async () => {
        const {
          body: { snapshots },
        } = await supertest
          .get(
            getApiPath({
              sortField: 'snapshot',
              sortDirection: 'desc',
            })
          )
          .set('kbn-xsrf', 'xxx')
          .send();
        const snapshotName = snapshots[0].snapshot;
        expect(snapshotName).to.eql('xyz_snapshot_4');
      });

      it('sorts by repository name (asc)', async () => {
        const {
          body: { snapshots },
        } = await supertest
          .get(
            getApiPath({
              sortField: 'repository',
              sortDirection: 'asc',
            })
          )
          .set('kbn-xsrf', 'xxx')
          .send();
        const snapshotName = snapshots[0].repository;
        expect(snapshotName).to.eql(REPO_NAME_1);
      });

      it('sorts by repository name (desc)', async () => {
        const {
          body: { snapshots },
        } = await supertest
          .get(
            getApiPath({
              sortField: 'repository',
              sortDirection: 'desc',
            })
          )
          .set('kbn-xsrf', 'xxx')
          .send();
        const snapshotName = snapshots[0].repository;
        expect(snapshotName).to.eql(REPO_NAME_2);
      });

      it('sorts by startTimeInMillis (asc)', async () => {
        const {
          body: { snapshots },
        } = await supertest
          .get(
            getApiPath({
              sortField: 'startTimeInMillis',
              sortDirection: 'asc',
            })
          )
          .set('kbn-xsrf', 'xxx')
          .send();
        const snapshotName = snapshots[0].snapshot;
        // the 1st snapshot that was created during this test setup
        expect(snapshotName).to.eql(snapshotName1);
      });

      it('sorts by startTimeInMillis (desc)', async () => {
        const {
          body: { snapshots },
        } = await supertest
          .get(
            getApiPath({
              sortField: 'startTimeInMillis',
              sortDirection: 'desc',
            })
          )
          .set('kbn-xsrf', 'xxx')
          .send();
        const snapshotName = snapshots[0].snapshot;
        // the last snapshot that was created during this test setup
        expect(snapshotName).to.eql('xyz_snapshot_4');
      });

      // these properties are only tested as being accepted by the API
      const sortFields = ['indices', 'durationInMillis', 'shards.total', 'shards.failed'];
      sortFields.forEach((sortField: string) => {
        it(`allows sorting by ${sortField} (asc)`, async () => {
          await supertest
            .get(
              getApiPath({
                sortField,
                sortDirection: 'asc',
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send()
            .expect(200);
        });

        it(`allows sorting by ${sortField} (desc)`, async () => {
          await supertest
            .get(
              getApiPath({
                sortField,
                sortDirection: 'desc',
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send()
            .expect(200);
        });
      });
    });

    describe('search', () => {
      describe('snapshot name', () => {
        it('exact match', async () => {
          // list snapshots with the name "a_snapshot_2"
          const searchField = 'snapshot';
          const searchValue = 'another_snapshot_2';
          const searchMatch = 'must';
          const searchOperator = 'exact';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(1);
          expect(snapshots[0].snapshot).to.eql('another_snapshot_2');
        });

        it('partial match', async () => {
          // list snapshots with the name starting with "xyz"
          const searchField = 'snapshot';
          const searchValue = 'xyz';
          const searchMatch = 'must';
          const searchOperator = 'eq';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(BATCH_SIZE_2);
          snapshots.forEach((snapshot: SnapshotDetails) => {
            expect(snapshot.snapshot).to.contain('xyz');
          });
        });

        it('excluding search with exact match', async () => {
          // list snapshots with the name not "xyz_snapshot_0f"
          const searchField = 'snapshot';
          const searchValue = 'xyz_snapshot_0';
          const searchMatch = 'must_not';
          const searchOperator = 'exact';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(SNAPSHOT_COUNT - 1);
          snapshots.forEach((snapshot: SnapshotDetails) => {
            expect(snapshot.snapshot).to.not.eql('xyz_snapshot_0');
          });
        });

        it('excluding search with partial match', async () => {
          // list snapshots with the name not starting with "xyz"
          const searchField = 'snapshot';
          const searchValue = 'xyz';
          const searchMatch = 'must_not';
          const searchOperator = 'eq';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(SNAPSHOT_COUNT - BATCH_SIZE_2);
          snapshots.forEach((snapshot: SnapshotDetails) => {
            expect(snapshot.snapshot).to.not.contain('xyz');
          });
        });
      });

      describe('repository name', () => {
        it('search for non-existent repository returns an empty snapshot array', async () => {
          // search for non-existent repository
          const searchField = 'repository';
          const searchValue = 'non-existent';
          const searchMatch = 'must';
          const searchOperator = 'exact';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(0);
        });

        it('exact match', async () => {
          // list snapshots from repository "test_repo_1"
          const searchField = 'repository';
          const searchValue = REPO_NAME_1;
          const searchMatch = 'must';
          const searchOperator = 'exact';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(1 + BATCH_SIZE_1);
          snapshots.forEach((snapshot: SnapshotDetails) => {
            expect(snapshot.repository).to.eql(REPO_NAME_1);
          });
        });

        it('partial match', async () => {
          // list snapshots from repository with the name starting with "test"
          const searchField = 'repository';
          const searchValue = 'test';
          const searchMatch = 'must';
          const searchOperator = 'eq';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(SNAPSHOT_COUNT);
        });

        it('excluding search with exact match', async () => {
          // list snapshots from repositories with the name not "test_repo_1"
          const searchField = 'repository';
          const searchValue = REPO_NAME_1;
          const searchMatch = 'must_not';
          const searchOperator = 'exact';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(BATCH_SIZE_2 + 1);
          snapshots.forEach((snapshot: SnapshotDetails) => {
            expect(snapshot.repository).to.not.eql(REPO_NAME_1);
          });
        });

        it('excluding search with partial match', async () => {
          // list snapshots from repository with the name not starting with "test"
          const searchField = 'repository';
          const searchValue = 'test';
          const searchMatch = 'must_not';
          const searchOperator = 'eq';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(0);
        });
      });

      describe('policy name', () => {
        it('search for non-existent policy returns an empty snapshot array', async () => {
          // search for non-existent policy
          const searchField = 'policyName';
          const searchValue = 'non-existent';
          const searchMatch = 'must';
          const searchOperator = 'exact';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(0);
        });

        it('exact match', async () => {
          // list snapshots created by the policy "test_policy_1"
          const searchField = 'policyName';
          const searchValue = POLICY_NAME_1;
          const searchMatch = 'must';
          const searchOperator = 'exact';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(1);
          expect(snapshots[0].policyName).to.eql(POLICY_NAME_1);
        });

        it('partial match', async () => {
          // list snapshots created by the policy with the name starting with "test"
          const searchField = 'policyName';
          const searchValue = 'test';
          const searchMatch = 'must';
          const searchOperator = 'eq';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(2);
          snapshots.forEach((snapshot: SnapshotDetails) => {
            expect(snapshot.policyName).to.contain('test');
          });
        });

        it('excluding search with exact match', async () => {
          // list snapshots created by the policy with the name not "test_policy_2"
          const searchField = 'policyName';
          const searchValue = POLICY_NAME_2;
          const searchMatch = 'must_not';
          const searchOperator = 'exact';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(SNAPSHOT_COUNT - 1);
          snapshots.forEach((snapshot: SnapshotDetails) => {
            expect(snapshot.repository).to.not.eql(POLICY_NAME_2);
          });
        });

        it('excluding search with partial match', async () => {
          // list snapshots created by the policy with the name not starting with "test"
          const searchField = 'policyName';
          const searchValue = 'test';
          const searchMatch = 'must_not';
          const searchOperator = 'eq';
          const {
            body: { snapshots },
          } = await supertest
            .get(
              getApiPath({
                searchField,
                searchValue,
                searchMatch,
                searchOperator,
              })
            )
            .set('kbn-xsrf', 'xxx')
            .send();

          expect(snapshots.length).to.eql(SNAPSHOT_COUNT - 2);
          snapshots.forEach((snapshot: SnapshotDetails) => {
            // policy name might be null if the snapshot was created not by a policy
            expect(snapshot.policyName ?? '').to.not.contain('test');
          });
        });
      });
    });
  });
}
