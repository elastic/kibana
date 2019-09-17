/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: { getService: any }) {
  const esArchiver = getService('esArchiver');
  const supertestSvc = getService('supertest');
  const generateAPI = {
    getCsvFromParamsInPayload: async (jobParams: object = {}) => {
      return await supertestSvc
        .post(`/api/reporting/generate/csv`)
        .set('kbn-xsrf', 'xxx')
        .send(jobParams);
    },
    getCsvFromParamsInQueryString: async (jobParams: string = '') => {
      return await supertestSvc
        .post(`/api/reporting/generate/csv${jobParams}`)
        .set('kbn-xsrf', 'xxx')
        .send(jobParams);
    },
  };

  describe('Generation from Job Params', () => {
    before(() =>
      Promise.all([
        esArchiver.load('reporting/logs'),
        esArchiver.load('logstash_functional')
      ])
    ); // prettier-ignore
    after(() =>
      Promise.all([
        esArchiver.unload('reporting/logs'),
        esArchiver.unload('logstash_functional')
      ])
    ); // prettier-ignore

    it('Rejects bogus jobParams', async () => {
      const { status: resStatus, text: resText } = (await generateAPI.getCsvFromParamsInPayload({
        jobParams: 0,
      })) as supertest.Response;

      expect(resStatus).to.eql(400);
      expect(resText).to.match(/\\\"jobParams\\\" must be a string/);
    });

    it('Rejects empty jobParams', async () => {
      const {
        status: resStatus,
        text: resText,
      } = (await generateAPI.getCsvFromParamsInPayload()) as supertest.Response;

      expect(resStatus).to.eql(400);
      expect(resText).to.match(/jobParams RISON string is required/);
    });

    it('Accepts jobParams in POST payload', async () => {
      const { status: resStatus } = (await generateAPI.getCsvFromParamsInPayload({
        jobParams: `(conflictedTypesFields:!(),fields:!('@timestamp',clientip,extension),indexPatternId:'logstash-*',metaFields:!(_source,_id,_type,_index,_score),searchRequest:(body:(_source:(excludes:!(),includes:!('@timestamp',clientip,extension)),docvalue_fields:!(),query:(bool:(filter:!((match_all:()),(range:('@timestamp':(gte:'2015-09-20T10:19:40.307Z',lt:'2015-09-20T10:26:56.221Z'))),(range:('@timestamp':(format:strict_date_optional_time,gte:'2004-09-17T21:19:34.213Z',lte:'2019-09-17T21:19:34.213Z')))),must:!(),must_not:!(),should:!())),script_fields:(),sort:!(('@timestamp':(order:desc,unmapped_type:boolean))),stored_fields:!('@timestamp',clientip,extension),version:!t),index:'logstash-*'),title:'A Saved Search With a DATE FILTER',type:search)`,
      })) as supertest.Response;
      expect(resStatus).to.eql(200);
    });

    it('Accepts jobParams in query string', async () => {
      const { status: resStatus, text: resText } = (await generateAPI.getCsvFromParamsInQueryString(
        `jobParams=(conflictedTypesFields:!(),fields:!(%27@timestamp%27,clientip,extension),indexPatternId:%27logstash-*%27,metaFields:!(_source,_id,_type,_index,_score),searchRequest:(body:(_source:(excludes:!(),includes:!(%27@timestamp%27,clientip,extension)),docvalue_fields:!(),query:(bool:(filter:!((match_all:()),(range:(%27@timestamp%27:(gte:%272015-09-20T10:19:40.307Z%27,lt:%272015-09-20T10:26:56.221Z%27))),(range:(%27@timestamp%27:(format:strict_date_optional_time,gte:%272004-09-17T21:19:34.213Z%27,lte:%272019-09-17T21:19:34.213Z%27)))),must:!(),must_not:!(),should:!())),script_fields:(),sort:!((%27@timestamp%27:(order:desc,unmapped_type:boolean))),stored_fields:!(%27@timestamp%27,clientip,extension),version:!t),index:%27logstash-*%27),title:%27A%20Saved%20Search%20With%20a%20DATE%20FILTER%27,type:search)`
      )) as supertest.Response;
      expect(resText).to.eql('abc');
      expect(resStatus).to.eql(200);
    });
  });
}
