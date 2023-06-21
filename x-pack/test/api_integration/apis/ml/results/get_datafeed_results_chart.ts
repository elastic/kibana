/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Datafeed, Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { ANNOTATION_TYPE } from '@kbn/ml-plugin/common/constants/annotations';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  // @ts-expect-error not full interface
  const JOB_CONFIG: Job = {
    job_id: `fq_multi_1_ae`,
    description:
      'mean/min/max(responsetime) partition=airline on farequote dataset with 1h bucket span',
    groups: ['farequote', 'automated', 'multi-metric'],
    analysis_config: {
      bucket_span: '1h',
      influencers: ['airline'],
      detectors: [
        { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
        { function: 'min', field_name: 'responsetime', partition_field_name: 'airline' },
        { function: 'max', field_name: 'responsetime', partition_field_name: 'airline' },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '20mb' },
    model_plot_config: { enabled: true },
  };

  // @ts-expect-error not full interface
  const DATAFEED_CONFIG: Datafeed = {
    datafeed_id: 'datafeed-fq_multi_1_ae',
    indices: ['ft_farequote'],
    job_id: 'fq_multi_1_ae',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  async function createMockJobs() {
    await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
    await ml.api.indexAnnotation({
      timestamp: 1454950800000,
      end_timestamp: 1454950860000,
      annotation: 'Test annotation',
      job_id: JOB_CONFIG.job_id,
      type: ANNOTATION_TYPE.ANNOTATION,
      event: 'user',
      detector_index: 1,
      partition_field_name: 'airline',
      partition_field_value: 'AAL',
    });
  }

  const requestBody = {
    jobId: JOB_CONFIG.job_id,
    start: 1454889600000, // February 8, 2016 12:00:00 AM GMT
    end: 1454976000000, // February 9, 2016 12:00:00 AM GMT
  };

  describe('GetDatafeedResultsChart', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createMockJobs();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('it should fetch datafeed chart data', async () => {
      const { body, status } = await supertest
        .post(`/internal/ml/results/datafeed_results_chart`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.bucketResults.length).to.eql(24);
      expect(body.datafeedResults.length).to.eql(24);
      expect(body.annotationResultsRect.length).to.eql(1);
      expect(body.annotationResultsLine.length).to.eql(0);
    });

    it('should validate request body', async () => {
      const incompleteRequestBody = {
        // MISSING JOB ID
        start: 1454889600000, // February 8, 2016 12:00:00 AM GMT
        end: 1454976000000, // February 9, 2016 12:00:00 AM GMT
      };

      const { body, status } = await supertest
        .post(`/internal/ml/results/datafeed_results_chart`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(incompleteRequestBody);
      ml.api.assertResponseStatusCode(400, status, body);

      expect(body.error).to.eql('Bad Request');
      expect(body.message).to.eql(
        '[request body.jobId]: expected value of type [string] but got [undefined]'
      );
    });

    it('it should not allow fetching of datafeed chart data without required permissions', async () => {
      const { body, status } = await supertest
        .post(`/internal/ml/results/datafeed_results_chart`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');
    });
  });
};
