/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createSignalsIndex, deleteAllAlerts, getIndexNameFromLoad } from '../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');

  const getSignalsMigrationStatus = async (query: any) => {
    const { body } = await supertest
      .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
      .query(query)
      .set('kbn-xsrf', 'true')
      .expect(200);

    const filteredIndices = body.indices.filter(
      (index: any) => index?.index !== '.internal.alerts-security.alerts-default-000001'
    );
    return filteredIndices;
  };

  describe('Signals migration status', () => {
    let legacySignalsIndexName: string;
    beforeEach(async () => {
      legacySignalsIndexName = getIndexNameFromLoad(
        await esArchiver.load('x-pack/test/functional/es_archives/signals/legacy_signals_index')
      );
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/signals/legacy_signals_index');
      await deleteAllAlerts(supertest, log, es);
    });

    it('returns no indexes if no signals exist in the specified range', async () => {
      const indices = await getSignalsMigrationStatus({ from: '2020-10-20' });
      expect(indices).to.eql([]);
    });

    it('includes an index if its signals are within the specified range', async () => {
      const indices = await getSignalsMigrationStatus({ from: '2020-10-10' });
      expect(indices).length(1);
      expect(indices[0].index).to.eql(legacySignalsIndexName);
    });

    it("returns the mappings version and a breakdown of signals' version", async () => {
      const outdatedIndexName = getIndexNameFromLoad(
        await esArchiver.load('x-pack/test/functional/es_archives/signals/outdated_signals_index')
      );

      const indices = await getSignalsMigrationStatus({ from: '2020-10-10' });
      expect(indices).to.eql([
        {
          index: legacySignalsIndexName,
          is_outdated: true,
          migrations: [],
          signal_versions: [
            {
              count: 1,
              version: 0,
            },
          ],
          version: 1,
        },
        {
          is_outdated: true,
          index: outdatedIndexName,
          migrations: [],
          signal_versions: [
            {
              count: 1,
              version: 3,
            },
          ],
          version: 3,
        },
      ]);

      await esArchiver.unload('x-pack/test/functional/es_archives/signals/outdated_signals_index');
    });

    it('rejects the request if the user does not have sufficient privileges', async () => {
      await createUserAndRole(getService, ROLES.t1_analyst);

      await supertestWithoutAuth
        .get(DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL)
        .set('kbn-xsrf', 'true')
        .auth(ROLES.t1_analyst, 'changeme')
        .query({ from: '2020-10-10' })
        .expect(403);

      await deleteUserAndRole(getService, ROLES.t1_analyst);
    });
  });
};
