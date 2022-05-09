/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { superUser } from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const ALERTS_INDEX_URL = `${TEST_URL}/index`;
  const SPACE1 = 'space1';
  const SPACE2 = 'space2';
  const APM_ALERT_ID = 'NoxgpHkBqbdrfX07MqXV';
  const APM_ALERT_INDEX = '.alerts-observability.apm.alerts';
  const SECURITY_SOLUTION_ALERT_INDEX = '.alerts-security.alerts';

  const getAPMIndexName = async (user: User) => {
    const { body: indexNames }: { body: { index_name: string[] | undefined } } =
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix(SPACE1)}${ALERTS_INDEX_URL}`)
        .set('kbn-xsrf', 'true')
        .expect(200);
    expect(
      indexNames?.index_name?.filter((indexName) => indexName.startsWith(APM_ALERT_INDEX)).length
    ).to.eql(1); // assert this here so we can use constants in the dynamically-defined test cases below
  };

  const getSecuritySolutionIndexName = async (user: User) => {
    const { body: indexNames }: { body: { index_name: string[] | undefined } } =
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix(SPACE1)}${ALERTS_INDEX_URL}`)
        .set('kbn-xsrf', 'true')
        .expect(200);
    expect(
      indexNames?.index_name?.filter((indexName) =>
        indexName.startsWith(`${SECURITY_SOLUTION_ALERT_INDEX}-${SPACE1}`)
      ).length
    ).to.eql(1); // assert this here so we can use constants in the dynamically-defined test cases below
  };

  describe('Alerts - GET - RBAC', () => {
    before(async () => {
      await getSecuritySolutionIndexName(superUser);
      await getAPMIndexName(superUser);

      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    it('should return a 404 when superuser accesses not-existent alert', async () => {
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix()}${TEST_URL}?id=myfakeid&index=${APM_ALERT_INDEX}`)
        .set('kbn-xsrf', 'true')
        .expect(404);
    });

    it('should return a 404 when superuser accesses not-existent alerts as data index', async () => {
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix()}${TEST_URL}?id=${APM_ALERT_ID}&index=myfakeindex`)
        .set('kbn-xsrf', 'true')
        .expect(404);
    });

    it(`${superUser.username} should be able to access alert ${APM_ALERT_ID} in ${SPACE2}/${APM_ALERT_INDEX}`, async () => {
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix(SPACE2)}${TEST_URL}?id=${APM_ALERT_ID}&index=${APM_ALERT_INDEX}`)
        .set('kbn-xsrf', 'true')
        .expect(200);
    });
  });
};
