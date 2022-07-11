/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { superUser, obsOnlySpacesAll, secOnlyRead } from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const ALERTS_FEATURE_IDS_URL = `${TEST_URL}/_feature_ids`;
  const SPACE1 = 'space1';

  const getApmFeatureIdByRegistrationContexts = async (
    user: User,
    space: string,
    expectedStatusCode: number = 200
  ) => {
    const resp = await supertestWithoutAuth
      .get(
        `${getSpaceUrlPrefix(space)}${ALERTS_FEATURE_IDS_URL}?registrationContext=observability.apm`
      )
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(expectedStatusCode);
    return resp.body as string[];
  };

  const getSecurityFeatureIdByRegistrationContexts = async (
    user: User,
    space: string,
    expectedStatusCode: number = 200
  ) => {
    const resp = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(space)}${ALERTS_FEATURE_IDS_URL}?registrationContext=security`)
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(expectedStatusCode);

    return resp.body as string[];
  };

  describe('Alert - Get feature ids by registration context', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });
    describe('Users:', () => {
      it(`${obsOnlySpacesAll.username} should be able to get feature id for registration context 'observability.apm' in ${SPACE1}`, async () => {
        const featureIds = await getApmFeatureIdByRegistrationContexts(obsOnlySpacesAll, SPACE1);
        expect(featureIds).to.eql(['apm']);
      });

      it(`${superUser.username} should be able to get feature id for registration context 'observability.apm' in ${SPACE1}`, async () => {
        const featureIds = await getApmFeatureIdByRegistrationContexts(superUser, SPACE1);
        expect(featureIds).to.eql(['apm']);
      });

      it(`${secOnlyRead.username} should NOT be able to get feature id  for registration context 'observability.apm' in ${SPACE1}`, async () => {
        const featureIds = await getApmFeatureIdByRegistrationContexts(secOnlyRead, SPACE1);
        expect(featureIds).to.eql([]);
      });

      it(`${secOnlyRead.username} should be able to get feature id for registration context 'security' in ${SPACE1}`, async () => {
        const featureIds = await getSecurityFeatureIdByRegistrationContexts(secOnlyRead, SPACE1);
        expect(featureIds).to.eql(['siem']);
      });
    });
  });
};
