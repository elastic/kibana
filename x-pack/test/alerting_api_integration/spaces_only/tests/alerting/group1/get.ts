/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest, Test } from 'supertest';
import { Spaces } from '../../../scenarios';
import {
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getExpectedRule,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

const getTestUtils = (
  describeType: 'internal' | 'public',
  objectRemover: ObjectRemover,
  supertest: SuperTest<Test>
) => {
  describe(describeType, () => {
    afterEach(() => objectRemover.removeAll());
    it('should handle get alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/${
          describeType === 'public' ? 'api' : 'internal'
        }/alerting/rule/${createdAlert.id}`
      );

      expect(response.status).to.eql(200);
      expect(response.body).to.eql(
        getExpectedRule({
          responseBody: response.body,
          username: 'elastic',
          overrides: {
            ...(describeType === 'internal'
              ? {
                  monitoring: response.body.monitoring,
                  snooze_schedule: response.body.snooze_schedule,
                  is_snoozed_until: response.body.is_snoozed_until,
                }
              : {}),
          },
        })
      );
      expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
      if (response.body.next_run) {
        expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
      }
    });

    it(`shouldn't find alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      await supertest
        .get(
          `${getUrlPrefix(Spaces.other.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rule/${createdAlert.id}`
        )
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [alert/${createdAlert.id}] not found`,
        });
    });

    it(`should handle get alert request appropriately when alert doesn't exist`, async () => {
      await supertest
        .get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rule/1`
        )
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [alert/1] not found',
        });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('get', () => {
    const objectRemover = new ObjectRemover(supertest);
    afterEach(() => objectRemover.removeAll());

    getTestUtils('public', objectRemover, supertest);
    getTestUtils('internal', objectRemover, supertest);

    describe('legacy', () => {
      it('should handle get alert request appropriately', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}`
        );

        expect(response.status).to.eql(200);
        expect(response.body).to.eql(
          getExpectedRule({
            responseBody: response.body,
          })
        );
        expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
        expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);
        if (response.body.nextRun) {
          expect(Date.parse(response.body.nextRun)).to.be.greaterThan(0);
        }
      });
    });
  });
}
