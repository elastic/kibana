/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  API_BASE_PATH,
  indexSettingDeprecations,
} from '../../../../plugins/upgrade_assistant/common/constants';
import { EnrichedDeprecationInfo } from '../../../../plugins/upgrade_assistant/common/types';

const translogSettingsIndexDeprecation: IndicesCreateRequest = {
  index: 'deprecated_settings',
  body: {
    settings: {
      // @ts-expect-error setting is removed in 8.0
      'translog.retention.size': '1b',
      'translog.retention.age': '5m',
      'index.soft_deletes.enabled': true,
    },
  },
};

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const security = getService('security');
  const es = getService('es');
  const log = getService('log');

  describe('Elasticsearch deprecations', () => {
    describe('GET /api/upgrade_assistant/es_deprecations', () => {
      describe('error handling', () => {
        it('handles auth error', async () => {
          const ROLE_NAME = 'authErrorRole';
          const USER_NAME = 'authErrorUser';
          const USER_PASSWORD = 'password';

          try {
            await security.role.create(ROLE_NAME, {});
            await security.user.create(USER_NAME, {
              password: USER_PASSWORD,
              roles: [ROLE_NAME],
            });

            await supertestWithoutAuth
              .get(`${API_BASE_PATH}/es_deprecations`)
              .auth(USER_NAME, USER_PASSWORD)
              .set('kbn-xsrf', 'kibana')
              .send()
              .expect(403);
          } finally {
            await security.role.delete(ROLE_NAME);
            await security.user.delete(USER_NAME);
          }
        });
      });

      // Only applicable on 7.x
      describe.skip('index setting deprecation', () => {
        before(async () => {
          try {
            // Create index that will trigger deprecation warning
            await es.indices.create(translogSettingsIndexDeprecation);
          } catch (e) {
            log.debug('Error creating test index');
            throw e;
          }
        });

        after(async () => {
          try {
            await es.indices.delete({
              index: [translogSettingsIndexDeprecation.index],
            });
          } catch (e) {
            log.debug('Error deleting text index');
            throw e;
          }
        });

        it('returns the expected deprecation message for deprecated translog index settings', async () => {
          const { body: apiRequestResponse } = await supertest
            .get(`${API_BASE_PATH}/es_deprecations`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          const indexSettingDeprecation = apiRequestResponse.deprecations.find(
            (deprecation: EnrichedDeprecationInfo) =>
              deprecation.index === translogSettingsIndexDeprecation.index
          );

          expect(indexSettingDeprecation.message).to.equal(
            indexSettingDeprecations.translog.deprecationMessage
          );
        });
      });
    });
  });
}
