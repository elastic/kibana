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
import { encodeMigrationToken } from '../../../../plugins/security_solution/server/lib/detection_engine/migrations/helpers';
import { SIGNALS_TEMPLATE_VERSION } from '../../../../plugins/security_solution/server/lib/detection_engine/routes/index/get_signals_template';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  getIndexNameFromLoad,
  waitFor,
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
      let legacySignalsIndexName: string;
      let outdatedSignalsIndexName: string;

      beforeEach(async () => {
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
      });

      it('returns the information necessary to finalize the migration', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(200);

        expect(body.indices).length(1);
        const [index] = body.indices;

        expect(index.index).to.eql(legacySignalsIndexName);
        expect(index.migration_id).to.be.a('string');
        expect(index.migration_id.length).to.be.greaterThan(0);
        expect(index.migration_index).not.to.eql(legacySignalsIndexName);
        expect(index.migration_index).to.contain(legacySignalsIndexName);
      });

      it('creates a new index containing migrated signals', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName, outdatedSignalsIndexName] })
          .expect(200);

        const indices = body.indices as Array<{ migration_id: string; migration_index: string }>;
        expect(indices).length(2);
        indices.forEach((index) => expect(index.migration_id).to.be.a('string'));

        const [{ migration_index: newIndex }] = indices;
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
        await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(200);

        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName] })
          .expect(200);

        const [{ error, ...info }] = body.indices;
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
      let migratingIndices: any[];

      beforeEach(async () => {
        legacySignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/legacy_signals_index')
        );
        outdatedSignalsIndexName = getIndexNameFromLoad(
          await esArchiver.load('signals/outdated_signals_index')
        );

        ({
          body: { indices: migratingIndices },
        } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [legacySignalsIndexName, outdatedSignalsIndexName] })
          .expect(200));
      });

      afterEach(async () => {
        await esArchiver.unload('signals/outdated_signals_index');
        await esArchiver.unload('signals/legacy_signals_index');
      });

      it('replaces the original index alias with the migrated one', async () => {
        const [migratingIndex] = migratingIndices;

        const { body } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const indicesBefore = (body.indices as Array<{ name: string }>).map((index) => index.name);

        expect(indicesBefore).to.contain(migratingIndex.index);
        expect(indicesBefore).not.to.contain(migratingIndex.migration_index);

        await waitFor(async () => {
          const {
            body: { completed },
          } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send({ migration_token: migratingIndex.migration_token })
            .expect(200);

          return completed;
        }, `polling finalize_migration until complete`);

        const { body: bodyAfter } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const indicesAfter = (bodyAfter.indices as Array<{ name: string }>).map(
          (index) => index.name
        );

        expect(indicesAfter).to.contain(migratingIndex.migration_index);
        expect(indicesAfter).not.to.contain(migratingIndex.index);
      });

      it('marks the original index for deletion by applying our cleanup policy', async () => {
        const [migratingIndex] = migratingIndices;

        await waitFor(async () => {
          const {
            body: { completed },
          } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send({ migration_token: migratingIndex.migration_token })
            .expect(200);

          return completed;
        }, `polling finalize_migration until complete`);

        const { body } = await es.indices.getSettings({ index: migratingIndex.index });
        const indexSettings = body[migratingIndex.index].settings.index;
        expect(indexSettings.lifecycle.name).to.eql(
          `${DEFAULT_SIGNALS_INDEX}-default-migration-cleanup`
        );
      });

      it('deletes the original index for deletion by applying our cleanup policy', async () => {
        const [migratingIndex] = migratingIndices;

        await waitFor(async () => {
          const {
            body: { completed },
          } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send({ migration_token: migratingIndex.migration_token })
            .expect(200);

          return completed;
        }, `polling finalize_migration until complete`);

        const { statusCode } = await es.tasks.get(
          { task_id: migratingIndex.migration_task_id },
          { ignore: [404] }
        );
        expect(statusCode).to.eql(404);
      });

      it('subsequent attempts at finalization are 404s', async () => {
        const [migratingIndex] = migratingIndices;

        await waitFor(async () => {
          const {
            body: { completed },
          } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send({ migration_token: migratingIndex.migration_token })
            .expect(200);

          return completed;
        }, `polling finalize_migration until complete`);

        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ migration_token: migratingIndex.migration_token })
          .expect(404);

        expect(body.status_code).to.eql(404);
        expect(body.message).to.contain('resource_not_found_exception');

        const { body: bodyAfter } = await supertest
          .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const indicesAfter = (bodyAfter.indices as Array<{ name: string }>).map(
          (index) => index.name
        );

        expect(indicesAfter).to.contain(migratingIndex.migration_index);
        expect(indicesAfter).not.to.contain(migratingIndex.index);
      });

      it('rejects if the provided token is invalid', async () => {
        const requestBody = { migration_token: 'invalid_token' };
        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send(requestBody)
          .expect(400);

        expect(body).to.eql({
          message: 'An error occurred while decoding the migration token: [invalid_token]',
          status_code: 400,
        });
      });

      it('rejects if the specified indexes do not match the task', async () => {
        const [
          { migration_index: destinationIndex, index: sourceIndex, migration_task_id: taskId },
        ] = migratingIndices;
        const migrationDetails = { destinationIndex, sourceIndex, taskId };
        const invalidToken = encodeMigrationToken({
          ...migrationDetails,
          sourceIndex: 'bad-index',
        });
        const requestBody = { migration_token: invalidToken };

        let finalizeResponse: any;

        await waitFor(async () => {
          const { body, status } = await supertest
            .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
            .set('kbn-xsrf', 'true')
            .send(requestBody);
          finalizeResponse = body;

          return status !== 200;
        }, `polling finalize_migration until task is complete (with error)`);

        expect(finalizeResponse).to.eql({
          message: `The specified task does not match the source and destination indexes. Task [${taskId}] did not specify source index [bad-index] and destination index [${destinationIndex}]`,
          status_code: 400,
        });
      });

      it('rejects if the task is malformed', async () => {
        const [
          { migration_index: destinationIndex, index: sourceIndex, migration_task_id: taskId },
        ] = migratingIndices;
        const migrationDetails = { destinationIndex, sourceIndex, taskId };
        const invalidToken = encodeMigrationToken({
          ...migrationDetails,
          taskId: 'bad-task-id',
        });
        const requestBody = { migration_token: invalidToken };

        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send(requestBody)
          .expect(400);

        expect(body).to.eql({
          message: 'illegal_argument_exception: malformed task id bad-task-id',
          status_code: 400,
        });
      });

      it('rejects if the task does not exist', async () => {
        const [
          { migration_index: destinationIndex, index: sourceIndex, migration_task_id: taskId },
        ] = migratingIndices;
        const migrationDetails = { destinationIndex, sourceIndex, taskId };
        const invalidToken = encodeMigrationToken({
          ...migrationDetails,
          taskId: 'oTUltX4IQMOUUVeiohTt8A:124',
        });
        const requestBody = { migration_token: invalidToken };

        const { body } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send(requestBody)
          .expect(404);

        expect(body).to.eql({
          message:
            "resource_not_found_exception: task [oTUltX4IQMOUUVeiohTt8A:124] belongs to the node [oTUltX4IQMOUUVeiohTt8A] which isn't part of the cluster and there is no record of the task",
          status_code: 404,
        });
      });

      it('rejects the request if the user does not have sufficient privileges', async () => {
        const [migratingIndex] = migratingIndices;
        await createUserAndRole(security, ROLES.t1_analyst);

        await supertestWithoutAuth
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ migration_token: migratingIndex.migration_token })
          .auth(ROLES.t1_analyst, 'changeme')
          .expect(403);
      });
    });
  });
};
