/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestAlertData } from '../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function basicAlertTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('basic alert', () => {
    it('should return 200 when creating a basic license alert', async () => {
      const { body: createdAction } = await supertest
        .post(`/api/actions/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          actionTypeId: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      await supertest
        .post(`/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {},
              },
            ],
          })
        )
        .expect(200);
    });
  });
}
