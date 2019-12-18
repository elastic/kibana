/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestAlertData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('find', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should handle find alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert');

      const response = await supertest.get(
        `${getUrlPrefix(
          Spaces.space1.id
        )}/api/alert/_find?search=test.noop&search_fields=alertTypeId`
      );

      expect(response.statusCode).to.eql(200);
      expect(response.body.page).to.equal(1);
      expect(response.body.perPage).to.be.greaterThan(0);
      expect(response.body.total).to.be.greaterThan(0);
      const match = response.body.data.find((obj: any) => obj.id === createdAlert.id);
      expect(match).to.eql({
        id: createdAlert.id,
        name: 'abc',
        tags: ['foo'],
        alertTypeId: 'test.noop',
        schedule: { interval: '1m' },
        enabled: true,
        actions: [],
        params: {},
        createdBy: null,
        scheduledTaskId: match.scheduledTaskId,
        updatedBy: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
      });
    });

    it(`shouldn't find alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'alert');

      await supertest
        .get(
          `${getUrlPrefix(
            Spaces.other.id
          )}/api/alert/_find?search=test.noop&search_fields=alertTypeId`
        )
        .expect(200, {
          page: 1,
          perPage: 20,
          total: 0,
          data: [],
        });
    });
  });
}
