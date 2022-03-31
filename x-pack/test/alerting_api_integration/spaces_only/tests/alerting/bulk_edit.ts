/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { checkAAD, getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('bulkEdit', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should edit alert with tags edit action', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['default'] }));

      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const payload = {
        ids: [createdAlert.id],
        operations: [
          {
            operation: 'add',
            field: 'tags',
            value: ['tag-1'],
          },
        ],
      };

      const bulkEditResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkEditResponse.body.errors).to.have.length(0);
      expect(bulkEditResponse.body.rules).to.have.length(1);
      expect(bulkEditResponse.body.rules[0].tags).to.eql(['default', 'tag-1']);

      const { body: updatedAlert } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo');

      expect(updatedAlert.tags).to.eql(['default', 'tag-1']);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdAlert.id,
      });
    });

    it('should edit multiple alerts with tags edit action', async () => {
      const { body: createdAlert1 } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['foo', 'bar'] }));
      const { body: createdAlert2 } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['bar'] }));

      objectRemover.add(Spaces.space1.id, createdAlert1.id, 'rule', 'alerting');
      objectRemover.add(Spaces.space1.id, createdAlert2.id, 'rule', 'alerting');

      const payload = {
        ids: [createdAlert1.id, createdAlert2.id],
        operations: [
          {
            operation: 'set',
            field: 'tags',
            value: ['rewritten'],
          },
        ],
      };

      const bulkEditResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkEditResponse.body.errors).to.have.length(0);
      expect(bulkEditResponse.body.rules).to.have.length(2);
      expect(bulkEditResponse.body.rules[0].tags).to.eql(['rewritten']);
      expect(bulkEditResponse.body.rules[1].tags).to.eql(['rewritten']);

      const updatedAlerts = await Promise.all([
        supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdAlert1.id}`)
          .set('kbn-xsrf', 'foo'),
        supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdAlert2.id}`)
          .set('kbn-xsrf', 'foo'),
      ]);

      expect(updatedAlerts[0].body.tags).to.eql(['rewritten']);
      expect(updatedAlerts[1].body.tags).to.eql(['rewritten']);
    });

    it(`shouldn't edit alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['default'] }));

      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const payload = {
        ids: [createdAlert.id],
        operations: [
          {
            operation: 'add',
            field: 'tags',
            value: ['tag-1'],
          },
        ],
      };

      await supertest
        .post(`${getUrlPrefix(Spaces.other.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload)
        .expect(200, { rules: [], errors: [] });
    });
  });
}
