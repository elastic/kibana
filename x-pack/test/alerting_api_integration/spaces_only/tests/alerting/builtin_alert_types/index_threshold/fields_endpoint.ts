/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { Spaces } from '../../../../scenarios';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { ESTestIndexTool, ES_TEST_INDEX_NAME, getUrlPrefix } from '../../../../../common/lib';

const API_URI = 'api/alerting_builtins/index_threshold/_fields';

// eslint-disable-next-line import/no-default-export
export default function fieldsEndpointTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('legacyEs');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('fields endpoint', () => {
    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    // this test will start failing if the fields/mappings of
    // the ES_TEST_INDEX changes
    it('should return fields from the test index', async () => {
      const query = { indexPatterns: [ES_TEST_INDEX_NAME] };

      const result = await runQueryExpect(query, 200);
      expect(result.fields).to.be.an('array');

      let field = getFieldNamed(result.fields, 'source');
      expect(field).to.eql({
        name: 'source',
        type: 'keyword',
        normalizedType: 'keyword',
        aggregatable: true,
        searchable: true,
      });

      field = getFieldNamed(result.fields, 'date');
      expect(field).to.eql({
        name: 'date',
        type: 'date',
        normalizedType: 'date',
        aggregatable: true,
        searchable: true,
      });

      field = getFieldNamed(result.fields, 'testedValue');
      expect(field).to.eql({
        name: 'testedValue',
        type: 'long',
        normalizedType: 'number',
        aggregatable: true,
        searchable: true,
      });
    });

    it('should return errors when expected', async () => {
      expect(await runQueryExpect(null, 400)).to.eql(
        bodyWithMessage('[request body]: expected a plain object value, but found [null] instead.')
      );
      expect(await runQueryExpect({}, 400)).to.eql(
        bodyWithMessage(
          '[request body.indexPatterns]: expected value of type [array] but got [undefined]'
        )
      );
      expect(await runQueryExpect({ indices: ['*'] }, 400)).to.eql(
        bodyWithMessage(
          '[request body.indexPatterns]: expected value of type [array] but got [undefined]'
        )
      );
      expect(await runQueryExpect({ indexPatterns: 'foo' }, 400)).to.eql(
        bodyWithMessage('[request body.indexPatterns]: could not parse array value from json input')
      );
      expect(await runQueryExpect({ indexPatterns: [1] }, 400)).to.eql(
        bodyWithMessage(
          '[request body.indexPatterns.0]: expected value of type [string] but got [number]'
        )
      );

      function bodyWithMessage(message: string): any {
        return {
          error: 'Bad Request',
          message,
          statusCode: 400,
        };
      }
    });

    it('should return an empty array for empty input', async () => {
      const result = await runQueryExpect({ indexPatterns: [] }, 200);
      expect(result.fields).to.be.an('array');
      expect(result.fields.length).to.be(0);
    });

    it('should handle indices that do not exist', async () => {
      const NON_EXISTANT_INDEX_NAME = 'non-existent-index-name-foo';
      const exactResult = await runQueryExpect({ indexPatterns: [ES_TEST_INDEX_NAME] }, 200);

      let indexPatterns = [NON_EXISTANT_INDEX_NAME];
      let testResult = await runQueryExpect({ indexPatterns }, 200);
      expect(testResult.fields.length).to.be(0);

      indexPatterns = [ES_TEST_INDEX_NAME, NON_EXISTANT_INDEX_NAME];
      testResult = await runQueryExpect({ indexPatterns }, 200);
      expect(testResult).to.eql(exactResult);

      indexPatterns = [NON_EXISTANT_INDEX_NAME, ES_TEST_INDEX_NAME];
      testResult = await runQueryExpect({ indexPatterns }, 200);
      expect(testResult).to.eql(exactResult);
    });

    it('should handle wildcards', async () => {
      const exactResult = await runQueryExpect({ indexPatterns: [ES_TEST_INDEX_NAME] }, 200);

      let indexPatterns = [`*${ES_TEST_INDEX_NAME}`];
      let testResult = await runQueryExpect({ indexPatterns }, 200);
      expect(testResult).to.eql(exactResult);

      indexPatterns = [`${ES_TEST_INDEX_NAME}*`];
      testResult = await runQueryExpect({ indexPatterns }, 200);
      expect(testResult).to.eql(exactResult);
    });

    it('should handle aliases', async () => {
      const result = await runQueryExpect({ indexPatterns: ['.kibana'] }, 200);
      const field = getFieldNamed(result.fields, 'updated_at');
      expect(field).to.be.ok();
      expect(field.name).to.eql('updated_at');
      expect(field.type).to.eql('date');
    });

    // TODO: the pattern '*a:b,c:d*' throws an exception in dev, but not ci!
    it('should handle no_such_remote_cluster', async () => {
      const result = await runQueryExpect({ indexPatterns: ['*a:b,c:d*'] }, 200);
      expect(result.fields.length).to.be(0);
    });
  });

  function getFieldNamed(fields: any[], fieldName: string): any | undefined {
    const matching = fields.filter((field) => field.name === fieldName);
    if (matching.length === 0) return;
    if (matching.length === 1) return matching[0];
    throw new Error(`multiple fields named ${fieldName}`);
  }

  async function runQueryExpect(requestBody: any, status: number): Promise<any> {
    const url = `${getUrlPrefix(Spaces.space1.id)}/${API_URI}`;
    const res = await supertest.post(url).set('kbn-xsrf', 'foo').send(requestBody);

    if (res.status !== status) {
      // good place to put a console log for debugging unexpected results
      // console.log(res.body)
      throw new Error(`expected status ${status}, but got ${res.status}`);
    }

    return res.body;
  }
}
