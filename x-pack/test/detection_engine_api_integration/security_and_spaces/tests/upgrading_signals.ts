/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_MIGRATE_SIGNALS_URL } from '../../../../plugins/security_solution/common/constants';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createSignalsIndex, deleteSignalsIndex } from '../../utils';
import { createUserAndRole } from '../roles_users_utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const esArchiver = getService('esArchiver');

  describe('Upgrading signals', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
    });

    describe('migration status of signals indexes', async () => {
      beforeEach(async () => {
        await esArchiver.load('signals/outdated_signals_index');
      });

      afterEach(async () => {
        await esArchiver.unload('signals/outdated_signals_index');
      });

      it('returns no indexes if no signals exist in the specified range', async () => {
        const { body } = await supertest
          .get(DETECTION_ENGINE_MIGRATE_SIGNALS_URL)
          .query({ from: '2020-10-20' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.indices).to.eql([]);
      });

      it('includes an index if its signals are within the specified range', async () => {
        const {
          body: { indices },
        } = await supertest
          .get(DETECTION_ENGINE_MIGRATE_SIGNALS_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(indices.length).to.eql(1);
        expect(indices[0].name).to.eql('.siem-signals-default-outdated');
      });

      it("returns the mappings version and a breakdown of signals' version", async () => {
        const { body } = await supertest
          .get(DETECTION_ENGINE_MIGRATE_SIGNALS_URL)
          .query({ from: '2020-10-10' })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(body.indices).to.eql([
          {
            name: '.siem-signals-default-outdated',
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
        ]);
      });

      it('rejects the request if the user does not have sufficient privileges', async () => {
        await createUserAndRole(security, ROLES.t1_analyst);

        await supertestWithoutAuth
          .get(DETECTION_ENGINE_MIGRATE_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .auth(ROLES.t1_analyst, 'changeme')
          .query({ from: '2020-10-10' })
          .expect(403);
      });
    });

    describe('upgrading signals', async () => {
      it('returns the information necessary to finalize the upgrade');
      it('returns null values for indexes that were specified but already upgraded');
      it('creates a new signals index containing upgraded signals');
      it('rejects a duplicated request as the destination index already exists');
      it('rejects the request if the user does not have sufficient privileges');
    });
    describe('finalizing signals upgrades', async () => {
      it('returns completed: false and parrots the parameters if the task is still pending');
      it('returns an error if the specified indexes do not match the task');
      it('returns an error if the task does not exist');
      it('returns an error if the original signals and the upgraded signals have different counts');
      it('replaces the original index alias with the upgraded one');
      it('marks the original index for deletion');
    });
  });
};
