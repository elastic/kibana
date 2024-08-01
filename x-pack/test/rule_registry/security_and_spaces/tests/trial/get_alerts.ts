/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  superUser,
  obsMinReadSpacesAll,
  obsMinRead,
  obsMinReadAlertsRead,
  obsMinReadAlertsReadSpacesAll,
} from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const ALERTS_INDEX_URL = `${TEST_URL}/index`;
  const SPACE1 = 'space1';
  const SPACE2 = 'space2';

  const getAPMIndexName = async (user: User) => {
    const { body: indexNames }: { body: { index_name: string[] | undefined } } =
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix(SPACE1)}${ALERTS_INDEX_URL}`)
        .auth(user.username, user.password)
        .set('kbn-xsrf', 'true')
        .expect(200);
    const observabilityIndex = indexNames?.index_name?.find(
      (indexName) => indexName === '.alerts-observability.apm.alerts'
    );
    expect(observabilityIndex).to.eql('.alerts-observability.apm.alerts');
    return observabilityIndex;
  };

  describe('rbac with subfeatures', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    describe('Users:', () => {
      // user with minimal_read and alerts_read privileges should be able to access apm alert
      it(`${obsMinReadAlertsRead.username} should be able to access the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}?id=NoxgpHkBqbdrfX07MqXV&index=${apmIndex}`)
          .auth(obsMinReadAlertsRead.username, obsMinReadAlertsRead.password)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
      it(`${obsMinReadAlertsReadSpacesAll.username} should be able to access the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}?id=NoxgpHkBqbdrfX07MqXV&index=${apmIndex}`)
          .auth(obsMinReadAlertsReadSpacesAll.username, obsMinReadAlertsReadSpacesAll.password)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it(`${obsMinRead.username} should NOT be able to access the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}?id=NoxgpHkBqbdrfX07MqXV&index=${apmIndex}`)
          .auth(obsMinRead.username, obsMinRead.password)
          .set('kbn-xsrf', 'true')
          .expect(404);
      });

      it(`${obsMinReadSpacesAll.username} should NOT be able to access the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}?id=NoxgpHkBqbdrfX07MqXV&index=${apmIndex}`)
          .auth(obsMinReadSpacesAll.username, obsMinReadSpacesAll.password)
          .set('kbn-xsrf', 'true')
          .expect(404);
      });
    });

    describe('Space:', () => {
      it(`${obsMinReadAlertsRead.username} should NOT be able to access the APM alert in ${SPACE2}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix(SPACE2)}${TEST_URL}?id=NoxgpHkBqbdrfX07MqXV&index=${apmIndex}`)
          .auth(obsMinReadAlertsRead.username, obsMinReadAlertsRead.password)
          .set('kbn-xsrf', 'true')
          .expect(403);
      });

      it(`${obsMinReadAlertsReadSpacesAll.username} should be able to access the APM alert in ${SPACE2}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix(SPACE2)}${TEST_URL}?id=NoxgpHkBqbdrfX07MqXV&index=${apmIndex}`)
          .auth(obsMinReadAlertsReadSpacesAll.username, obsMinReadAlertsReadSpacesAll.password)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      describe('extra params', () => {
        it('should NOT allow to pass a filter query parameter', async () => {
          await supertest
            .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}?sortOrder=asc&namespaces[0]=*`)
            .set('kbn-xsrf', 'true')
            .send()
            .expect(400);
        });

        it('should NOT allow to pass a non supported query parameter', async () => {
          await supertest
            .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}?notExists=something`)
            .set('kbn-xsrf', 'true')
            .send()
            .expect(400);
        });
      });
    });
  });
};
