/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestAlertData } from './utils';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle update alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert');

      const updatedData = {
        alertTypeParams: {
          foo: true,
        },
        interval: '12s',
        actions: [],
      };
      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/alert/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send(updatedData)
        .expect(200, {
          ...updatedData,
          id: createdAlert.id,
          updatedBy: null,
          apiKeyOwner: null,
        });
    });
  });
}
