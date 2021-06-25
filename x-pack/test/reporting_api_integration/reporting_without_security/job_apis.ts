/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { forOwn } from 'lodash';
import { JOB_PARAMS_RISON_CSV_DEPRECATED } from '../services/fixtures';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestNoAuth = getService('supertestWithoutAuth');
  const reportingAPI = getService('reportingAPI');

  describe('Job Listing APIs', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/logs');
      await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
    });

    afterEach(async () => {
      await reportingAPI.deleteAllReports();
    });

    it('Posted CSV job is visible in the job count', async () => {
      const { status: resStatus, text: resText } = await supertestNoAuth
        .post(`/api/reporting/generate/csv`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV_DEPRECATED });

      expect(resStatus).to.be(200);

      const { job: resJob } = JSON.parse(resText);
      const expectedResJob: Record<string, any> = {
        attempts: 0,
        created_by: false,
        jobtype: 'csv',
        status: 'pending',
      };
      forOwn(expectedResJob, (value: any, key: string) => {
        expect(resJob[key]).to.eql(value, key);
      });

      // call the job count api
      const { text: countText } = await supertestNoAuth
        .get(`/api/reporting/jobs/count`)
        .set('kbn-xsrf', 'xxx');

      const countResult = JSON.parse(countText);
      expect(countResult).to.be(1);
    });

    it('Posted CSV job is visible in the status check', async () => {
      const { status: resStatus, text: resText } = await supertestNoAuth
        .post(`/api/reporting/generate/csv`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV_DEPRECATED });

      expect(resStatus).to.be(200);

      const { job: resJob } = JSON.parse(resText);
      // call the single job listing api (status check)
      const { text: listText } = await supertestNoAuth
        .get(`/api/reporting/jobs/list?page=0&ids=${resJob.id}`)
        .set('kbn-xsrf', 'xxx');

      const listingJobs = JSON.parse(listText);

      const expectedListJob: Record<string, any> = {
        attempts: 0,
        created_by: false,
        jobtype: 'csv',
      };
      forOwn(expectedListJob, (value: any, key: string) => {
        expect(listingJobs[0]._source[key]).to.eql(value, key);
      });

      expect(listingJobs.length).to.be(1);
      expect(listingJobs[0]._id).to.be(resJob.id);
    });

    it('Posted CSV job is visible in the first page of jobs listing', async () => {
      const { status: resStatus, text: resText } = await supertestNoAuth
        .post(`/api/reporting/generate/csv`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV_DEPRECATED });

      expect(resStatus).to.be(200);

      const { job: resJob } = JSON.parse(resText);
      // call the ALL job listing api
      const { text: listText } = await supertestNoAuth
        .get(`/api/reporting/jobs/list?page=0`)
        .set('kbn-xsrf', 'xxx');

      const listingJobs = JSON.parse(listText);
      const expectedListJob: Record<string, any> = {
        attempts: 0,
        created_by: false,
        jobtype: 'csv',
      };
      forOwn(expectedListJob, (value: any, key: string) => {
        expect(listingJobs[0]._source[key]).to.eql(value, key);
      });

      expect(listingJobs.length).to.be(1);
      expect(listingJobs[0]._id).to.be(resJob.id);
    });
  });
}
