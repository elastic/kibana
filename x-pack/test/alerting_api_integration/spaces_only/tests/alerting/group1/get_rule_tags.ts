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

  describe('getRuleTags', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createRule = async (overrides = {}) => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData(overrides))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      return createdRule.id;
    };

    afterEach(() => objectRemover.removeAll());

    describe('get rule tags when there are no rules', function () {
      this.tags('skipFIPS');
      it('should get rule tags when there are no rules', async () => {
        const response = await supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_tags`)
          .expect(200);

        expect(response.body).to.eql({
          data: [],
          per_page: 50,
          page: 1,
          total: 0,
        });
      });
    });

    describe('get rule tags from all rules', function () {
      this.tags('skipFIPS');
      it('should get rule tags from all rules', async () => {
        await Promise.all(
          tags.map(async (tag, index) => {
            await createRule({ tags: [tag, `${tag}_${index}`] });
          })
        );

        await createRule({ tags: ['a', 'b', 'c', '1', '2'] });

        const response = await supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_tags`)
          .expect(200);

        expect(response.body).to.eql({
          data: [
            '1',
            '2',
            'a',
            'a_0',
            'b',
            'b_1',
            'c',
            'c_2',
            'd',
            'd_3',
            'e',
            'e_4',
            'f',
            'f_5',
            'g',
            'g_6',
            'h',
            'h_7',
            'i',
            'i_8',
            'j',
            'j_9',
          ],
          per_page: 50,
          page: 1,
          total: 22,
        });
      });
    });

    describe('paginate rule tags', function () {
      this.tags('skipFIPS');
      it('should paginate rule tags', async () => {
        await createRule({
          tags: ['1', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '110'],
        });
        await createRule({
          tags: ['2', '20', '21', '22', '23', '24', '25', '26', '1', '111', '1111'],
        });
        await createRule({
          tags: ['3', '30', '31', '32', '33', '34', '35', '36', '37', '1', '111', '11_11'],
        });

        let response = await supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_tags?page=1&per_page=10`)
          .expect(200);

        expect(response.body).to.eql({
          data: ['1', '10', '11', '110', '111', '1111', '11_11', '12', '13', '14'],
          per_page: 10,
          page: 1,
          total: 32,
        });

        response = await supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_tags?page=2&per_page=10`)
          .expect(200);

        expect(response.body).to.eql({
          data: ['15', '16', '17', '18', '19', '2', '20', '21', '22', '23'],
          per_page: 10,
          page: 2,
          total: 32,
        });

        response = await supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_tags?page=4&per_page=10`)
          .expect(200);

        expect(response.body).to.eql({
          data: ['36', '37'],
          per_page: 10,
          page: 4,
          total: 32,
        });
      });
    });

    it('should search and paginate rule tags', async () => {
      await createRule({
        tags: ['1', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '110'],
      });
      await createRule({
        tags: ['2', '20', '21', '22', '23', '24', '25', '26', '1', '111', '1111'],
      });
      await createRule({
        tags: ['3', '30', '31', '32', '33', '34', '35', '36', '37', '1', '11111', '11_11'],
      });

      let response = await supertest
        .get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/internal/alerting/rules/_tags?page=1&per_page=5&search=1`
        )
        .expect(200);

      expect(response.body).to.eql({
        data: ['1', '10', '11', '110', '111'],
        per_page: 5,
        page: 1,
        total: 16,
      });

      response = await supertest
        .get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/internal/alerting/rules/_tags?page=2&per_page=5&search=1`
        )
        .expect(200);

      expect(response.body).to.eql({
        data: ['1111', '11111', '11_11', '12', '13'],
        per_page: 5,
        page: 2,
        total: 16,
      });

      response = await supertest
        .get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/internal/alerting/rules/_tags?page=1&per_page=5&search=11`
        )
        .expect(200);

      expect(response.body).to.eql({
        data: ['11', '110', '111', '1111', '11111'],
        per_page: 5,
        page: 1,
        total: 6,
      });
    });
  });
}
