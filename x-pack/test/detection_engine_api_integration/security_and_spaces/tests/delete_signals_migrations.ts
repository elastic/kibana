/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
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
  const esArchiver = getService('esArchiver');
  const kbnClient = getService('kibanaServer');
  const security = getService('security');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('deleting signals migrations', () => {
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
            indices: [finalizedMigration],
          },
        } = await supertest
          .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
          .set('kbn-xsrf', 'true')
          .send({ index: [outdatedSignalsIndexName] })
          .expect(200));

        return finalizedMigration.completed ?? false;
      }, `polling finalize_migration until all complete`);
    });

    afterEach(async () => {
      await esArchiver.unload('signals/outdated_signals_index');
      await deleteMigrations({
        kbnClient,
        ids: [createdMigration.migration_id],
      });
      await deleteSignalsIndex(supertest);
    });

    it('soft-deletes the migration SavedObject', async () => {
      const { body } = await supertest
        .delete(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .send({ index: [outdatedSignalsIndexName] })
        .expect(200);

      const deletedIndex = body.indices[0];
      const deletedMigration = deletedIndex.migrations[0];
      expect(deletedMigration.attributes.sourceIndex).to.eql(outdatedSignalsIndexName);
      expect(deletedMigration.attributes.deleted).to.eql(true);
    });

    it('rejects the request if the user does not have sufficient privileges', async () => {
      await createUserAndRole(security, ROLES.t1_analyst);

      const { body } = await supertestWithoutAuth
        .delete(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
        .set('kbn-xsrf', 'true')
        .send({ index: [outdatedSignalsIndexName] })
        .auth(ROLES.t1_analyst, 'changeme')
        .expect(200);

      const deletedMigration = body.indices[0];

      expect(deletedMigration.index).to.eql(createdMigration.index);
      expect(deletedMigration.completed).not.to.eql(true);
      expect(deletedMigration.error).to.eql({
        message:
          'security_exception: action [indices:data/write/bulk[s]] is unauthorized for user [t1_analyst] on indices [.tasks], this action is granted by the privileges [create_doc,create,delete,index,write,all]',
        status_code: 403,
      });
    });
  });
};
