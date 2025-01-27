/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { superUser, obsOnlySpacesAll, secOnlyRead } from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const SPACE1 = 'space1';
  const TEST_URL = '/internal/rac/alerts/browser_fields';

  const getBrowserFieldsByFeatureId = async (
    user: User,
    ruleTypeIds: string[],
    expectedStatusCode: number = 200
  ) => {
    const resp = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
      .query({ ruleTypeIds })
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(expectedStatusCode);

    return resp.body;
  };

  describe('Alert - Get browser fields by rule type IDs', () => {
    const ruleTypeIds = [
      ...OBSERVABILITY_RULE_TYPE_IDS,
      '.es-query',
      'xpack.ml.anomaly_detection_alert',
    ];

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    describe('Users:', () => {
      it(`${obsOnlySpacesAll.username} should be able to get browser fields for o11y ruleTypeIds that has access to`, async () => {
        const resp = await getBrowserFieldsByFeatureId(obsOnlySpacesAll, ruleTypeIds);

        expect(Object.keys(resp.browserFields)).toEqual([
          'base',
          'agent',
          'cloud',
          'container',
          'error',
          'host',
          'kibana',
          'observer',
          'orchestrator',
          'service',
          'tls',
          'url',
        ]);
      });

      it(`${superUser.username} should be able to get browser fields for all o11y ruleTypeIds`, async () => {
        const resp = await getBrowserFieldsByFeatureId(superUser, ruleTypeIds);

        expect(Object.keys(resp.browserFields)).toEqual([
          'base',
          'agent',
          'anomaly',
          'cloud',
          'container',
          'error',
          'host',
          'kibana',
          'location',
          'monitor',
          'observer',
          'orchestrator',
          'service',
          'slo',
          'tls',
          'url',
        ]);
      });

      it(`${superUser.username} should NOT be able to get browser fields for siem rule types`, async () => {
        await getBrowserFieldsByFeatureId(superUser, ['siem.queryRule'], 404);
      });

      it(`${secOnlyRead.username} should NOT be able to get browser fields for siem rule types`, async () => {
        await getBrowserFieldsByFeatureId(secOnlyRead, ['siem.queryRule'], 404);
      });
    });
  });
};
