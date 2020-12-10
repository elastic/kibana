/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import {
  DEFAULT_SIGNALS_INDEX,
  DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
} from '../../../../plugins/security_solution/common/constants';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { SIGNALS_TEMPLATE_VERSION } from '../../../../plugins/security_solution/server/lib/detection_engine/routes/index/get_signals_template';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteMigrations,
  deleteSignalsIndex,
  getIndexNameFromLoad,
  waitFor,
  waitForIndexToPopulate,
} from '../../utils';
import { createUserAndRole } from '../roles_users_utils';

interface StatusResponse {
  name: string;
  is_outdated: boolean;
}

interface CreateResponse {
  index: string;
  migration_index: string;
  migration_id: string;
}

interface FinalizeResponse extends CreateResponse {
  completed?: boolean;
  error?: unknown;
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kbnClient = getService('kibanaServer');
  const security = getService('security');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('Migrating signals', () => {
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
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .query({ from: '2020-10-20' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.indices).to.eql([]);
      });

      it('includes an index if its signals are within the specified range', async () => {
        const {
          body: { indices },
        } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
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
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.indices).to.eql([
          {
            name: legacySignalsIndexName,
            is_outdated: true,
            migrations: [],
            signal_versions: [
              {
                doc_count: 1,
                key: 0,
              },
            ],
            version: 1,
          },
          {
            is_outdated: true,
            name: outdatedIndexName,
            migrations: [],
            signal_versions: [
              {
                doc_count: 1,
                key: 3,
              },
            ],
            version: 3,
          },
        ]);

        await esArchiver.unload('signals/outdated_signals_index');
      });

      it('rejects the request if the user does not have sufficient privileges', async () => {
        await createUserAndRole(security, ROLES.t1_analyst);

        await supertestWithoutAuth
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .auth(ROLES.t1_analyst, 'changeme')
          .query({ from: '2020-10-10' })
          .expect(403);
      });
    });

    describe('Creating a signals migration', async () => {
      let createdMigrations: CreateResponse[];
      let legacySignalsIndexName: string;
      let outdatedSignalsIndexName: string;

      beforeEach(async () => {
        createdMigrations = [];
        legacySignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/legacy_signals_index')
        );
        outdatedSignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/outdated_signals_index')
        );
      });

      afterEach(async () => {
        await esArchiver.unload('signals/outdated_signals_index');
        await esArchiver.unload('signals/legacy_signals_index');
        await deleteMigrations({
          kbnClient,
          ids: createdMigrations.filter((m) => m?.migration_id).map((m) => m.migration_id),
        });
      });

      it('returns the information necessary to finalize the migration', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(200);
        createdMigrations = [...createdMigrations, ...body.indices];

        expect(body.indices).length(1);
        const [createdMigration] = body.indices;

        expect(createdMigration.index).to.eql(legacySignalsIndexName);
        expect(createdMigration.migration_id).to.be.a('string');
        expect(createdMigration.migration_id.length).to.be.greaterThan(0);
        expect(createdMigration.migration_index).not.to.eql(legacySignalsIndexName);
        expect(createdMigration.migration_index).to.contain(legacySignalsIndexName);
      });

      it('creates a new index containing migrated signals', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName, outdatedSignalsIndexName] })
          .expect(200);
        createdMigrations = [...createdMigrations, ...body.indices];
        const createResponses: CreateResponse[] = body.indices;

        expect(createResponses).length(2);
        createResponses.forEach((response) => expect(response.migration_id).to.be.a('string'));

        const [{ migration_index: newIndex }] = createResponses;
        await waitForIndexToPopulate(es, newIndex);
        const { body: migrationResults } = await es.search({ index: newIndex });

        expect(migrationResults.hits.hits).length(1);
        const migratedSignal = migrationResults.hits.hits[0]._source.signal;
        expect(migratedSignal._meta.version).to.equal(SIGNALS_TEMPLATE_VERSION);
      });

      it('specifying the signals alias itself is a bad request', async () => {
        const signalsAlias = `${DEFAULT_SIGNALS_INDEX}-default`;

        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [signalsAlias, legacySignalsIndexName] })
          .expect(400);

        expect(body).to.eql({
          message:
            'The following indices are not signals indices and cannot be migrated: [.siem-signals-default].',
          status_code: 400,
        });
      });

      it('rejects extant non-signals indexes', async () => {
        const unrelatedIndex = '.tasks';
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName, unrelatedIndex] })
          .expect(400);

        expect(body).to.eql({
          message:
            'The following indices are not signals indices and cannot be migrated: [.tasks].',
          status_code: 400,
        });
      });

      it('rejects if an unknown index is specified', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: ['random-index', outdatedSignalsIndexName] })
          .expect(400);

        expect(body).to.eql({
          message:
            'The following indices are not signals indices and cannot be migrated: [random-index].',
          status_code: 400,
        });
      });

      it('returns an inline error on a duplicated request as the destination index already exists', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(200);
        createdMigrations = [...createdMigrations, ...body.indices];

        const { body: duplicatedBody } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(200);

        const [{ error, ...info }] = duplicatedBody.indices;
        expect(info).to.eql({
          index: legacySignalsIndexName,
          migration_index: null,
          migration_id: null,
        });
        expect(error.status_code).to.eql(400);
        expect(error.message).to.contain('resource_already_exists_exception');
      });

      it('rejects the request if the user does not have sufficient privileges', async () => {
        await createUserAndRole(security, ROLES.t1_analyst);

        await supertestWithoutAuth
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .auth(ROLES.t1_analyst, 'changeme')
          .send({ index: [legacySignalsIndexName] })
          .expect(403);
      });
    });

    describe('finalizing signals migrations', async () => {
      let legacySignalsIndexName: string;
      let outdatedSignalsIndexName: string;
      let createdMigrations: CreateResponse[];
      let createdMigration: CreateResponse;

      beforeEach(async () => {
        createdMigrations = [];
        legacySignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/legacy_signals_index')
        );
        outdatedSignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/outdated_signals_index')
        );

        ({
          body: { indices: createdMigrations },
        } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(200));

        [createdMigration] = createdMigrations;
      });

      afterEach(async () => {
        await esArchiver.unload('signals/outdated_signals_index');
        await esArchiver.unload('signals/legacy_signals_index');
        await deleteMigrations({
          kbnClient,
          ids: createdMigrations.filter((m) => m?.migration_id).map((m) => m.migration_id),
        });
      });

      it('replaces the original index alias with the migrated one', async () => {
        const { body } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const statusResponses: StatusResponse[] = body.indices;
        const indicesBefore = statusResponses.map((index) => index.name);

        expect(indicesBefore).to.contain(createdMigration.index);
        expect(indicesBefore).not.to.contain(createdMigration.migration_index);

        await waitFor(async () => {
          const {
            body: {
              indices: [{ completed }],
            },
          } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send({ index: [createdMigration.index] })
            .expect(200);

          return completed === true;
        }, `polling finalize_migration until complete`);

        let statusAfter: StatusResponse[] = [];
        await waitFor(async () => {
          ({
            body: { indices: statusAfter },
          } = await supertest
            .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
            .query({ from: '2020-10-10' })
            .set('kbn-xsrf', 'true')
            .expect(200));
          return statusAfter.some((s) => !s.is_outdated);
        }, `polling finalize_migration until complete`);

        const indicesAfter = statusAfter.map((s) => s.name);

        expect(indicesAfter).to.contain(createdMigration.migration_index);
        expect(indicesAfter).not.to.contain(createdMigration.index);
      });

      it('finalizes an arbitrary number of indices', async () => {
        // start our second migration
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [outdatedSignalsIndexName] })
          .expect(200);
        createdMigrations = [...createdMigrations, ...body.indices];

        let finalizeResponse: FinalizeResponse[];
        await waitFor(async () => {
          ({
            body: { indices: finalizeResponse },
          } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send({ index: createdMigrations.map((m) => m.index) })
            .expect(200));

          return finalizeResponse.every((index) => index.completed);
        }, `polling finalize_migration until all complete`);

        const { body: bodyAfter } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const statusAfter: StatusResponse[] = bodyAfter.indices;
        expect(statusAfter.map((s) => s.name)).to.eql(
          createdMigrations.map((c) => c.migration_index)
        );
        expect(statusAfter.map((s) => s.is_outdated)).to.eql([false, false]);
      });

      it('marks the original index for deletion by applying our cleanup policy', async () => {
        await waitFor(async () => {
          const {
            body: {
              indices: [{ completed }],
            },
          } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send({ index: [createdMigration.index] })
            .expect(200);

          return completed;
        }, `polling finalize_migration until complete`);

        const { body } = await es.indices.getSettings({ index: createdMigration.index });
        const indexSettings = body[createdMigration.index].settings.index;
        expect(indexSettings.lifecycle.name).to.eql(
          `${DEFAULT_SIGNALS_INDEX}-default-migration-cleanup`
        );
      });

      it.skip('deletes the underlying migration task', async () => {
        await waitFor(async () => {
          const {
            body: { completed },
          } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send({ index: [createdMigration.index] })
            .expect(200);

          return completed;
        }, `polling finalize_migration until complete`);

        // const [{ taskId }] = await getMigration({ id: migration.migration_id });
        // expect(taskId.length).greaterThan(0);
        // const { statusCode } = await es.tasks.get({ task_id: taskId }, { ignore: [404] });
        // expect(statusCode).to.eql(404);
      });

      it('subsequent attempts at finalization are idempotent', async () => {
        await waitFor(async () => {
          const {
            body: {
              indices: [{ completed }],
            },
          } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send({ index: [createdMigration.index] })
            .expect(200);

          return completed;
        }, `polling finalize_migration until complete`);

        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [createdMigration.index] })
          .expect(200);
        const finalizeResponse: FinalizeResponse = body.indices[0];
        expect(finalizeResponse.completed).to.eql(true);
        expect(finalizeResponse.index).to.eql(createdMigration.index);

        const { body: bodyAfter } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const statusAfter: StatusResponse[] = bodyAfter.indices;
        const indicesAfter = statusAfter.map((index) => index.name);

        expect(indicesAfter).to.contain(createdMigration.migration_index);
        expect(indicesAfter).not.to.contain(createdMigration.index);
      });

      it('rejects inline if the index does not exist', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: ['dne-index'] })
          .expect(200);
        const finalizeResponse: FinalizeResponse = body.indices[0];

        expect(finalizeResponse.completed).not.to.eql(true);
        expect(finalizeResponse.error).to.eql({
          message: 'The specified index has no migrations',
          status_code: 400,
        });
      });

      it('rejects inline if the index has no migrations', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [outdatedSignalsIndexName] })
          .expect(200);
        const finalizeResponse: FinalizeResponse = body.indices[0];

        expect(finalizeResponse.index).to.eql(outdatedSignalsIndexName);
        expect(finalizeResponse.completed).not.to.eql(true);
        expect(finalizeResponse.error).to.eql({
          message: 'The specified index has no migrations',
          status_code: 400,
        });
      });

      it('rejects the request if the user does not have sufficient privileges', async () => {
        await createUserAndRole(security, ROLES.t1_analyst);

        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [createdMigration.index] })
          .auth(ROLES.t1_analyst, 'changeme')
          .expect(200);

        const finalizeResponse: FinalizeResponse = body.indices[0];

        expect(finalizeResponse.index).to.eql(createdMigration.index);
        expect(finalizeResponse.completed).not.to.eql(true);
        expect(finalizeResponse.error).to.eql({
          message:
            'security_exception: action [cluster:monitor/task/get] is unauthorized for user [t1_analyst]',
          status_code: 403,
        });
      });
    });
  });
};
