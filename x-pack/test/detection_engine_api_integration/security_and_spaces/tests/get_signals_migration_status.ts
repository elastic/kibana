/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL } from '../../../../plugins/security_solution/common/constants';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createSignalsIndex, deleteSignalsIndex, getIndexNameFromLoad } from '../../utils';
import { createUserAndRole } from '../roles_users_utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
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

      it.todo('does not include migrations that have been deleted');

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
  });
};
