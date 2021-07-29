/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
} from '../../../../plugins/security_solution/common/constants';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteMigrations,
  deleteSignalsIndex,
  getIndexNameFromLoad,
  waitFor,
} from '../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';

interface StatusResponse {
  index: string;
  is_outdated: boolean;
}

interface CreateResponse {
  index: string;
  migration_index: string;
  migration_id: string;
}

interface FinalizeResponse {
  id: string;
  completed?: boolean;
  error?: unknown;
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const esArchiver = getService('esArchiver');
  const kbnClient = getService('kibanaServer');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('Finalizing signals migrations', () => {
    let legacySignalsIndexName: string;
    let outdatedSignalsIndexName: string;
    let createdMigrations: CreateResponse[];
    let createdMigration: CreateResponse;

    beforeEach(async () => {
      createdMigrations = [];
      await createSignalsIndex(supertest);
      legacySignalsIndexName = getIndexNameFromLoad(
        await esArchiver.load('x-pack/test/functional/es_archives/signals/legacy_signals_index')
      );
      outdatedSignalsIndexName = getIndexNameFromLoad(
        await esArchiver.load('x-pack/test/functional/es_archives/signals/outdated_signals_index')
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
      await esArchiver.unload('x-pack/test/functional/es_archives/signals/outdated_signals_index');
      await esArchiver.unload('x-pack/test/functional/es_archives/signals/legacy_signals_index');
      await deleteMigrations({
        kbnClient,
        ids: createdMigrations.filter((m) => m?.migration_id).map((m) => m.migration_id),
      });
      await deleteSignalsIndex(supertest);
    });

    it('replaces the original index alias with the migrated one', async () => {
      const { body } = await supertest
        .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
        .query({ from: '2020-10-10' })
        .set('kbn-xsrf', 'true')
        .expect(200);
      const statusResponses: StatusResponse[] = body.indices;
      const indicesBefore = statusResponses.map((index) => index.index);

      expect(indicesBefore).to.contain(createdMigration.index);
      expect(indicesBefore).not.to.contain(createdMigration.migration_index);

      await waitFor(async () => {
        const {
          body: {
            migrations: [{ completed }],
          },
        } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ migration_ids: [createdMigration.migration_id] })
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

      const indicesAfter = statusAfter.map((s) => s.index);

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
          body: { migrations: finalizeResponse },
        } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ migration_ids: createdMigrations.map((m) => m.migration_id) })
          .expect(200));

        return finalizeResponse.every((index) => index.completed);
      }, `polling finalize_migration until all complete`);

      const { body: bodyAfter } = await supertest
        .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
        .query({ from: '2020-10-10' })
        .set('kbn-xsrf', 'true')
        .expect(200);

      const statusAfter: StatusResponse[] = bodyAfter.indices;
      expect(statusAfter.map((s) => s.index)).to.eql(
        createdMigrations.map((c) => c.migration_index)
      );
      expect(statusAfter.map((s) => s.is_outdated)).to.eql([false, false]);
    });

    it.skip('deletes the underlying migration task', async () => {
      await waitFor(async () => {
        const {
          body: {
            migrations: [{ completed }],
          },
        } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ migration_ids: [createdMigration.migration_id] })
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
            migrations: [{ completed }],
          },
        } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ migration_ids: [createdMigration.migration_id] })
          .expect(200);

        return completed;
      }, `polling finalize_migration until complete`);

      const { body } = await supertest
        .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .send({ migration_ids: [createdMigration.migration_id] })
        .expect(200);
      const finalizeResponse: FinalizeResponse = body.migrations[0];
      expect(finalizeResponse.completed).to.eql(true);
      expect(finalizeResponse.id).to.eql(createdMigration.migration_id);

      const { body: bodyAfter } = await supertest
        .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
        .query({ from: '2020-10-10' })
        .set('kbn-xsrf', 'true')
        .expect(200);

      const statusAfter: StatusResponse[] = bodyAfter.indices;
      const indicesAfter = statusAfter.map((index) => index.index);

      expect(indicesAfter).to.contain(createdMigration.migration_index);
      expect(indicesAfter).not.to.contain(createdMigration.index);
    });

    it('returns a 404 for DNE migrations', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .send({ migration_ids: ['dne-migration'] })
        .expect(404);

      expect(body).to.eql({
        message: 'Saved object [security-solution-signals-migration/dne-migration] not found',
        status_code: 404,
      });
    });

    it('rejects the request if the user does not have sufficient privileges', async () => {
      await createUserAndRole(getService, ROLES.t1_analyst);

      const { body } = await supertestWithoutAuth
        .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .send({ migration_ids: [createdMigration.migration_id] })
        .auth(ROLES.t1_analyst, 'changeme')
        .expect(200);

      const finalizeResponse: FinalizeResponse & {
        error: { message: string; status_code: number };
      } = body.migrations[0];

      expect(finalizeResponse.id).to.eql(createdMigration.migration_id);
      expect(finalizeResponse.completed).not.to.eql(true);
      expect(finalizeResponse.error.message).to.match(/^security_exception/);
      expect(finalizeResponse.error.status_code).to.eql(403);
      await deleteUserAndRole(getService, ROLES.t1_analyst);
    });
  });
};
