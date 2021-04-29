/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function swimlaneTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('swimlane action', () => {
    it('should return 403 when creating a swimlane action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A swimlane action',
          actionTypeId: '.swimlane',
          config: {
            apiUrl: 'http://localhost',
            appId: '123456asdf',
            username: 'username',
          },
          secrets: {
            apiToken: 'swimlane-api-key',
          },
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .swimlane is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });
  });
}
