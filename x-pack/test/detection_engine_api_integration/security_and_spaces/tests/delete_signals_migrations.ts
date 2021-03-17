/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DEFAULT_SIGNALS_INDEX,
  DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
} from '../../../../plugins/security_solution/common/constants';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createSignalsIndex, deleteSignalsIndex, getIndexNameFromLoad, waitFor } from '../../utils';
import { createUserAndRole } from '../roles_users_utils';

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
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/94367
  describe.skip('deleting signals migrations', () => {
    let outdatedSignalsIndexName: string;
    let createdMigration: CreateResponse;
    let finalizedMigration: FinalizeResponse;

    beforeEach(async () => {
      await createSignalsIndex(supertest);
      outdatedSignalsIndexName = getIndexNameFromLoad(
        await esArchiver.load('signals/outdated_signals_index')
      );

      ({
        body: {
          indices: [createdMigration],
        },
      } = await supertest
        .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .send({ index: [outdatedSignalsIndexName] })
        .expect(200));

      await waitFor(async () => {
        ({
          body: {
            migrations: [finalizedMigration],
          },
        } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ migration_ids: [createdMigration.migration_id] })
          .expect(200));

        return finalizedMigration.completed ?? false;
      }, `polling finalize_migration until all complete`);
    });

    afterEach(async () => {
      await esArchiver.unload('signals/outdated_signals_index');
      await deleteSignalsIndex(supertest);
    });

    it('returns the deleted migration SavedObjects', async () => {
      const { body } = await supertest
        .delete(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .send({ migration_ids: [createdMigration.migration_id] })
        .expect(200);

      const deletedMigration = body.migrations[0];
      expect(deletedMigration.id).to.eql(createdMigration.migration_id);
      expect(deletedMigration.sourceIndex).to.eql(outdatedSignalsIndexName);
    });

    it('marks the original index for deletion by applying our cleanup policy', async () => {
      await supertest
        .delete(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .send({ migration_ids: [createdMigration.migration_id] })
        .expect(200);

      const { body } = await es.indices.getSettings({ index: createdMigration.index });
      const indexSettings = body[createdMigration.index].settings.index;
      expect(indexSettings.lifecycle.name).to.eql(
        `${DEFAULT_SIGNALS_INDEX}-default-migration-cleanup`
      );
    });

    it('returns a 404 trying to delete a migration that does not exist', async () => {
      const { body } = await supertest
        .delete(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
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
        .delete(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .send({ migration_ids: [createdMigration.migration_id] })
        .auth(ROLES.t1_analyst, 'changeme')
        .expect(200);

      const deletedMigration = body.migrations[0];

      expect(deletedMigration.id).to.eql(createdMigration.migration_id);
      expect(deletedMigration.error).to.eql({
        message:
          'security_exception: action [indices:admin/settings/update] is unauthorized for user [t1_analyst] on indices [], this action is granted by the index privileges [manage,all]',
        status_code: 403,
      });
    });
  });
};
