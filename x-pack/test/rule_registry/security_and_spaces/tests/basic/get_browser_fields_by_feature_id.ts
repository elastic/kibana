/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
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
    featureIds: string[],
    expectedStatusCode: number = 200
  ) => {
    const resp = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
      .query({ featureIds })
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(expectedStatusCode);
    return resp.body;
  };

  describe('Alert - Get browser fields by featureId', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    describe('Users:', () => {
      it(`${obsOnlySpacesAll.username} should be able to get browser fields for o11y featureIds`, async () => {
        const resp = await getBrowserFieldsByFeatureId(obsOnlySpacesAll, [
          'apm',
          'infrastructure',
          'logs',
          'uptime',
        ]);
        expect(Object.keys(resp.browserFields)).toEqual(
          expect.arrayContaining(['base', 'event', 'kibana'])
        );
      });

      it(`${superUser.username} should be able to get browser fields for o11y featureIds`, async () => {
        const resp = await getBrowserFieldsByFeatureId(superUser, [
          'apm',
          'infrastructure',
          'logs',
          'uptime',
        ]);
        expect(Object.keys(resp.browserFields)).toEqual(
          expect.arrayContaining([
            'base',
            'agent',
            'anomaly',
            'ecs',
            'error',
            'event',
            'kibana',
            'monitor',
            'observer',
            'tls',
            'url',
          ])
        );
      });

      it(`${superUser.username} should NOT be able to get browser fields for siem featureId`, async () => {
        await getBrowserFieldsByFeatureId(superUser, ['siem'], 404);
      });

      it(`${secOnlyRead.username} should NOT be able to get browser fields for siem featureId`, async () => {
        await getBrowserFieldsByFeatureId(secOnlyRead, ['siem'], 404);
      });
    });
  });
};
