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
    it('Rejects bogus jobParams', async () => {
      // load test data that contains a saved search and documents
      await esArchiver.load('reporting/logs');

      const { status: resStatus, text: resText } = (await generateAPI.getCsvFromParamsInPayload({
        jobParams: 0,
      })) as supertest.Response;

      expect(resStatus).to.eql(400);
      expect(resText).to.match(/\\\"jobParams\\\" must be a string/);

      await esArchiver.unload('reporting/logs');
    });

    it('Rejects empty jobParams', async () => {
      // load test data that contains a saved search and documents
      await esArchiver.load('reporting/logs');

      const {
        status: resStatus,
        text: resText,
      } = (await generateAPI.getCsvFromParamsInPayload()) as supertest.Response;

      expect(resStatus).to.eql(400);
      expect(resText).to.match(/jobParams RISON string is required/);

      await esArchiver.unload('reporting/logs');
    });

    it('Accepts jobParams in POST payload', async () => {
      // load test data that contains a saved search and documents
      await esArchiver.load('reporting/logs');
      const { status: resStatus } = (await generateAPI.getCsvFromParamsInPayload({
        jobParams:
          "(conflictedTypesFields:!(),fields:!('@date',_id,_index,_score,_type,country,metric,name),indexPatternId:b6a10720-ce76-11e9-aa85-47efb3fa905c,metaFields:!(_source,_id,_type,_index,_score),searchRequest:(body:(_source:(excludes:!()),docvalue_fields:!((field:'@date',format:date_time)),query:(bool:(filter:!((match_all:()),(range:('@date':(format:strict_date_optional_time,gte:'2004-01-01T07:00:00.000Z',lte:'2019-09-13T00:43:32.540Z')))),must:!(),must_not:!(),should:!())),script_fields:(),sort:!(('@date':(order:desc,unmapped_type:boolean))),stored_fields:!('*'),version:!t),index:tests),title:'New Saved Search 4',type:search)",
      })) as supertest.Response;
      expect(resStatus).to.eql(200);
      await esArchiver.unload('reporting/logs');
    });

    it('Accepts jobParams in query string', async () => {
      // load test data that contains a saved search and documents
      await esArchiver.load('reporting/logs');
      const { status: resStatus } = (await generateAPI.getCsvFromParamsInQueryString(
        '?jobParams=(conflictedTypesFields:!(),fields:!(%27@date%27,_id,_index,_score,_type,country,metric,name),indexPatternId:b6a10720-ce76-11e9-aa85-47efb3fa905c,metaFields:!(_source,_id,_type,_index,_score),searchRequest:(body:(_source:(excludes:!()),docvalue_fields:!((field:%27@date%27,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(%27@date%27:(format:strict_date_optional_time,gte:%272004-01-01T07:00:00.000Z%27,lte:%272019-09-13T00:43:32.540Z%27)))),must:!(),must_not:!(),should:!())),script_fields:(),sort:!((%27@date%27:(order:desc,unmapped_type:boolean))),stored_fields:!(%27*%27),version:!t),index:tests),title:%27New%20Saved%20Search%204%27,type:search)'
      )) as supertest.Response;
      expect(resStatus).to.eql(200);
      await esArchiver.unload('reporting/logs');
    });
  });
}
