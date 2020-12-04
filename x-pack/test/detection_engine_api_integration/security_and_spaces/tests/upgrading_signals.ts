/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_SIGNALS_FINALIZE_UPGRADE_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATE_URL,
  DETECTION_ENGINE_SIGNALS_UPGRADE_URL,
} from '../../../../plugins/security_solution/common/constants';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { SIGNALS_TEMPLATE_VERSION } from '../../../../plugins/security_solution/server/lib/detection_engine/routes/index/get_signals_template';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  getIndexNameFromLoad,
  waitForIndexToPopulate,
} from '../../utils';
import { createUserAndRole } from '../roles_users_utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('Upgrading signals', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
    });

    describe('migration status of signals indexes', async () => {
      let legacySignalsIndexName: string;

      beforeEach(async () => {
        legacySignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/legacy_signals_index')
        );
      });

      afterEach(async () => {
        await esArchiver.unload('signals/legacy_signals_index');
      });

      it('returns no indexes if no signals exist in the specified range', async () => {
        const { body } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATE_URL)
          .query({ from: '2020-10-20' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.indices).to.eql([]);
      });

      it('includes an index if its signals are within the specified range', async () => {
        const {
          body: { indices },
        } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATE_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(indices).length(1);
        expect(indices[0].name).to.eql(legacySignalsIndexName);
      });

      it("returns the mappings version and a breakdown of signals' version", async () => {
        const outdatedIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/outdated_signals_index')
        );

        const { body } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATE_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.indices).to.eql([
          {
            name: legacySignalsIndexName,
            version: 1,
            migration_versions: [
              {
                doc_count: 1,
                key: 0,
              },
            ],
            schema_versions: [
              {
                doc_count: 1,
                key: 0,
              },
            ],
          },
          {
            name: outdatedIndexName,
            version: 3,
            migration_versions: [
              {
                doc_count: 1,
                key: 0,
              },
            ],
            schema_versions: [
              {
                doc_count: 1,
                key: 3,
              },
            ],
          },
        ]);

        await esArchiver.unload('signals/outdated_signals_index');
      });

      it('rejects the request if the user does not have sufficient privileges', async () => {
        await createUserAndRole(security, ROLES.t1_analyst);

        await supertestWithoutAuth
          .get(DETECTION_ENGINE_SIGNALS_MIGRATE_URL)
          .set('kbn-xsrf', 'true')
          .auth(ROLES.t1_analyst, 'changeme')
          .query({ from: '2020-10-10' })
          .expect(403);
      });
    });

    describe('upgrading signals', async () => {
      let legacySignalsIndexName: string;
      let outDatedSignalsIndexName: string;

      beforeEach(async () => {
        legacySignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/legacy_signals_index')
        );
        outDatedSignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/outdated_signals_index')
        );
      });

      afterEach(async () => {
        await esArchiver.unload('signals/outdated_signals_index');
        await esArchiver.unload('signals/legacy_signals_index');
      });

      it('returns the information necessary to finalize the upgrade', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(200);

        expect(body.indices).length(1);
        const [upgradeInfo] = body.indices;
        expect(upgradeInfo.source_index).to.eql(legacySignalsIndexName);
        expect(upgradeInfo.destination_index).not.to.eql(legacySignalsIndexName);
        expect(upgradeInfo.destination_index).to.contain(legacySignalsIndexName);
        expect(upgradeInfo.task_id).to.be.a('string');
        expect(upgradeInfo.task_id.length).to.be.greaterThan(0);
      });

      it('creates a new index containing upgraded signals', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName, outDatedSignalsIndexName] })
          .expect(200);

        expect(body.indices).length(2);
        (body.indices as Array<{ task_id: unknown }>).forEach((index) =>
          expect(index.task_id).to.be.a('string')
        );

        const [{ destination_index: newIndex }] = body.indices;
        await waitForIndexToPopulate(es, newIndex);
        const { body: upgradeResults } = await es.search({ index: newIndex });
        expect(upgradeResults.hits.hits).length(1);
        const upgradedSignal = upgradeResults.hits.hits[0]._source.signal;
        expect(upgradedSignal._meta.schema_version).to.equal(SIGNALS_TEMPLATE_VERSION);
      });

      it('returns null values for indexes that were specified but not upgraded', async () => {
        const currentWriteIndex = '.siem-signals-default-000001';

        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [currentWriteIndex] })
          .expect(200);

        expect(body.indices).length(1);
        const [upgradeInfo] = body.indices;
        expect(upgradeInfo.source_index).to.eql(currentWriteIndex);
        expect(upgradeInfo.destination_index).to.be(null);
        expect(upgradeInfo.task_id).to.be(null);
      });

      it('rejects a duplicated request as the destination index already exists', async () => {
        await supertest
          .post(DETECTION_ENGINE_SIGNALS_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(200);

        await supertest
          .post(DETECTION_ENGINE_SIGNALS_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(400);
      });

      it('rejects the request if the user does not have sufficient privileges', async () => {
        await createUserAndRole(security, ROLES.t1_analyst);

        await supertestWithoutAuth
          .post(DETECTION_ENGINE_SIGNALS_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .auth(ROLES.t1_analyst, 'changeme')
          .send({ index: [legacySignalsIndexName] })
          .expect(403);
      });
    });

    describe('finalizing signals upgrades', async () => {
      let legacySignalsIndexName: string;
      let outDatedSignalsIndexName: string;
      let upgradeResponse: any;

      beforeEach(async () => {
        legacySignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/legacy_signals_index')
        );
        outDatedSignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/outdated_signals_index')
        );

        ({ body: upgradeResponse } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName, outDatedSignalsIndexName] })
          .expect(200));
      });

      afterEach(async () => {
        await esArchiver.unload('signals/outdated_signals_index');
        await esArchiver.unload('signals/legacy_signals_index');
      });

      it('returns an error if the specified indexes do not match the task', async () => {
        const upgradeInfo = { ...upgradeResponse.indices[0], destination_index: 'bad index' };
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .send(upgradeInfo)
          .expect(400);

        expect(body).to.eql({
          message: `Upgrade parameters are invalid. The task_id [${upgradeInfo.task_id}] did not correspond to the indices [${upgradeInfo.source_index},${upgradeInfo.destination_index}]`,
          status_code: 400,
        });
      });

      it('returns an error if the task does not exist', async () => {
        const upgradeInfo = { ...upgradeResponse.indices[0], task_id: 'nope' };
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .send(upgradeInfo)
          .expect(400);

        expect(body).to.eql({
          message: `Upgrade parameters are invalid. The task_id [${upgradeInfo.task_id}] does not exist.`,
          status_code: 400,
        });
      });

      it('returns an error if the original signals and the upgraded signals have different counts');

      it('replaces the original index alias with the upgraded one', async () => {
        const upgradeInfo = upgradeResponse.indices[0];
        await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_UPGRADE_URL)
          .set('kbn-xsrf', 'true')
          .send(upgradeInfo)
          .expect(200);

        const { body } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATE_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.indices).to.contain({
          name: upgradeInfo.destination_index,
        });
      });

      it('marks the original index for deletion');
    });
  });
};
