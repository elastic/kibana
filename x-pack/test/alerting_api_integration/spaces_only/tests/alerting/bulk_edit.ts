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
import type { SanitizedRule } from '../../../../../plugins/alerting/common';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('bulkEdit', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should bulk edit rule with tags operation', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['default'] }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
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
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo');

      expect(updatedAlert.tags).to.eql(['default', 'tag-1']);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should bulk edit multiple rules with tags operation', async () => {
      const rules: SanitizedRule[] = (
        await Promise.all(
          Array.from({ length: 10 }).map(() =>
            supertest
              .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getTestRuleData({ tags: [`multiple-rules-edit`] }))
              .expect(200)
          )
        )
      ).map((res) => res.body);

      rules.forEach((rule) => {
        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');
      });

      const payload = {
        filter: `alert.attributes.tags: "multiple-rules-edit"`,
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

      expect(bulkEditResponse.body.total).to.be(10);
      expect(bulkEditResponse.body.errors).to.have.length(0);
      expect(bulkEditResponse.body.rules).to.have.length(10);
      bulkEditResponse.body.rules.every((rule: { tags: string[] }) =>
        expect(rule.tags).to.eql([`rewritten`])
      );

      const updatedRules: SanitizedRule[] = (
        await Promise.all(
          rules.map((rule) =>
            supertest
              .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${rule.id}`)
              .set('kbn-xsrf', 'foo')
          )
        )
      ).map((res) => res.body);

      updatedRules.forEach((rule) => {
        expect(rule.tags).to.eql([`rewritten`]);
      });
    });

    it(`shouldn't bulk edit rule from another space`, async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ tags: ['default'] }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
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
        .expect(200, { rules: [], errors: [], total: 0 });
    });
  });
}
