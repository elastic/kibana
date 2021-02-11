/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DEFAULT_SIGNALS_INDEX,
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
  waitForIndexToPopulate,
} from '../../utils';
import { createUserAndRole, deleteUserAndRole } from '../roles_users_utils';

interface CreateResponse {
  index: string;
  migration_index: string;
  migration_id: string;
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kbnClient = getService('kibanaServer');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('Creating signals migrations', () => {
    let createdMigrations: CreateResponse[];
    let legacySignalsIndexName: string;
    let outdatedSignalsIndexName: string;

    beforeEach(async () => {
      createdMigrations = [];
      await createSignalsIndex(supertest);

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
      await deleteSignalsIndex(supertest);
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
        message: 'The following indices are not signals indices and cannot be migrated: [.tasks].',
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
      await createUserAndRole(getService, ROLES.t1_analyst);

      await supertestWithoutAuth
        .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .auth(ROLES.t1_analyst, 'changeme')
        .send({ index: [legacySignalsIndexName] })
        .expect(400);

      await deleteUserAndRole(getService, ROLES.t1_analyst);
    });
  });
};
