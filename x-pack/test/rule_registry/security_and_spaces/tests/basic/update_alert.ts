/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import {
  secOnly,
  secOnlyRead,
  obsOnlySpacesAll,
  obsOnlyReadSpacesAll,
  superUser,
  noKibanaPrivileges,
} from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/api/rac/alerts';
  const ALERTS_INDEX_URL = `${TEST_URL}/index`;
  const SPACE1 = 'space1';

  const getAPMIndexName = async (user: User) => {
    const {
      body: indexNames,
    }: { body: { index_name: string[] | undefined } } = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(SPACE1)}${ALERTS_INDEX_URL}`)
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(200);
    const observabilityIndex = indexNames?.index_name?.find(
      (indexName) => indexName === '.alerts-observability-apm'
    );
    expect(observabilityIndex).to.eql('.alerts-observability-apm');
    return observabilityIndex;
  };

  describe('rbac', () => {
    describe('Users update:', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
      });
      afterEach(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
      });
      it(`${superUser.username} should be able to update the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(superUser.username, superUser.password)
          .set('kbn-xsrf', 'true')
          .send({ ids: ['NoxgpHkBqbdrfX07MqXV'], status: 'closed', index: apmIndex })
          .expect(200);
      });

      it(`${obsOnlySpacesAll.username} should be able to update the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(obsOnlySpacesAll.username, obsOnlySpacesAll.password)
          .set('kbn-xsrf', 'true')
          .send({ ids: ['NoxgpHkBqbdrfX07MqXV'], status: 'closed', index: apmIndex })
          .expect(200);
      });
      it(`${obsOnlyReadSpacesAll.username} should NOT be able to update the APM alert in ${SPACE1}`, async () => {
        const apmIndex = await getAPMIndexName(superUser);
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
          .auth(obsOnlyReadSpacesAll.username, obsOnlyReadSpacesAll.password)
          .set('kbn-xsrf', 'true')
          .send({ ids: ['NoxgpHkBqbdrfX07MqXV'], status: 'closed', index: apmIndex })
          .expect(403);
      });

      for (const scenario of [
        {
          user: noKibanaPrivileges,
        },
        {
          user: secOnly,
        },
        {
          user: secOnlyRead,
        },
      ]) {
        it(`${scenario.user.username} should NOT be able to update the APM alert in ${SPACE1}`, async () => {
          const apmIndex = await getAPMIndexName(superUser);
          await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
            .auth(scenario.user.username, scenario.user.password)
            .set('kbn-xsrf', 'true')
            .send({
              ids: ['NoxgpHkBqbdrfX07MqXV'],
              status: 'closed',
              index: apmIndex,
            })
            .expect(403);
        });
      }
    });
  });
};
