/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function pagerdutyTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('pagerduty action', () => {
    it('should return 403 when creating a pagerduty action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A pagerduty action',
          actionTypeId: '.pagerduty',
          config: {
            apiUrl: 'http://localhost',
          },
          secrets: {
            routingKey: 'pager-duty-routing-key',
          },
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .pagerduty is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });
  });
}
