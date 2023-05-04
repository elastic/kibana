/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

// eslint-disable-next-line import/no-default-export
export default function createAggregateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const createRule = async (overrides = {}) => {
    const { body: createdRule } = await supertest
      .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(getTestRuleData(overrides))
      .expect(200);

    return createdRule.id;
  };

  describe('getRuleTags', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should get rule tags when there are no rules', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_tags`
      );

      expect(response.status).to.eql(200);
      expect(response.body.rule_tags.filter((tag: string) => tag !== 'foo')).to.eql([]);
    });

    it('should get rule tags from all rules', async () => {
      await Promise.all(
        tags.map(async (tag) => {
          const ruleId = await createRule({ tags: [tag] });
          objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');
        })
      );

      const ruleId = await createRule({ tags: ['a', 'b', 'c'] });
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_tags`
      );

      expect(response.status).to.eql(200);
      expect(response.body.rule_tags.filter((tag: string) => tag !== 'foo').sort()).to.eql(
        tags.sort()
      );
    });

    it('should paginate rule tags', async () => {
      await Promise.all(
        tags.map(async (tag) => {
          const ruleId = await createRule({ tags: [tag] });
          objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');
        })
      );

      const ruleId = await createRule({ tags: ['foo'] });
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_tags?max_tags=5`
      );

      expect(response.status).to.eql(200);
      expect(response.body.rule_tags).to.eql(tags.sort().slice(0, 5));

      const paginatedResponse = await supertest.get(
        `${getUrlPrefix(
          Spaces.space1.id
        )}/internal/alerting/rules/_tags?max_tags=5&after=${JSON.stringify({
          tags: 'e',
        })}`
      );

      expect(paginatedResponse.status).to.eql(200);
      expect(paginatedResponse.body.rule_tags).to.eql(['f', 'foo', 'g', 'h', 'i']);
    });

    it('should search rule tags', async () => {
      await Promise.all(
        tags.map(async (tag) => {
          const ruleId = await createRule({ tags: [tag] });
          objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');
        })
      );

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_tags?search=a`
      );

      expect(response.body.rule_tags.filter((tag: string) => tag !== 'foo')).to.eql(['a']);
    });
  });
}
