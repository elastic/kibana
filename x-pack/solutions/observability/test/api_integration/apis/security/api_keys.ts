/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { getServiceApiKeyPrivileges } from '@kbn/synthetics-plugin/server/synthetics_service/get_api_key';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('API Keys', () => {
    // uses getServiceApiKeyPrivileges from the synthetics plugin
    describe('with kibana privileges', () => {
      describe('POST /internal/security/api_key', () => {
        it('should allow an API Key to be created', async () => {
          await supertest
            .post('/internal/security/api_key')
            .set('kbn-xsrf', 'xxx')
            .send({
              name: 'test_api_key',
              expiration: '12d',
              kibana_role_descriptors: {
                uptime_save: {
                  elasticsearch: getServiceApiKeyPrivileges(false),
                  kibana: [
                    {
                      base: [],
                      spaces: [ALL_SPACES_ID],
                      feature: {
                        uptime: ['all'],
                      },
                    },
                  ],
                },
              },
            })
            .expect(200)
            .then((response: Record<string, any>) => {
              const { name } = response.body;
              expect(name).to.eql('test_api_key');
            });
        });
      });
    });
  });
}
