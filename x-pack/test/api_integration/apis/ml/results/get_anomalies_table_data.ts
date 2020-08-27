/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { USER } from '../../../../functional/services/ml/security_common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { Datafeed, Job } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

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

  const DATAFEED_CONFIG: Datafeed = {
    datafeed_id: 'datafeed-fq_multi_1_se',
    indices: ['ft_farequote'],
    job_id: 'fq_multi_1_ae',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  async function createMockJobs() {
    await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
  }

  describe('GetAnomaliesTableData', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createMockJobs();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should fetch anomalies table data', async () => {
      const requestBody = {
        jobIds: [JOB_CONFIG.job_id],
        criteriaFields: [{ fieldName: 'detector_index', fieldValue: 0 }],
        influencers: [],
        aggregationInterval: 'auto',
        threshold: 0,
        earliestMs: 1454889600000, // February 8, 2016 12:00:00 AM GMT
        latestMs: 1454976000000, // February 9, 2016 12:00:00 AM GMT
        dateFormatTz: 'UTC',
        maxRecords: 500,
      };

      const { body } = await supertest
        .post(`/api/ml/results/anomalies_table_data`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(200);

      expect(body.interval).to.eql('hour');
      expect(body.anomalies.length).to.eql(12);
    });

    it('should validate request body', async () => {
      const requestBody = {
        // missing jobIds
        criteriaFields: [{ fieldName: 'detector_index', fieldValue: 0 }],
        influencers: [],
        aggregationInterval: 'auto',
        threshold: 0,
        // invalid earliest and latest instead of earliestMs and latestMs
        earliest: 1454889600000, // February 8, 2016 12:00:00 AM GMT
        latest: 1454976000000, // February 9, 2016 12:00:00 AM GMT
        dateFormatTz: 'UTC',
        maxRecords: 500,
      };

      const { body } = await supertest
        .post(`/api/ml/results/anomalies_table_data`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(400);

      expect(body.error).to.eql('Bad Request');
      expect(body.message).to.eql(
        '[request body.jobIds]: expected value of type [array] but got [undefined]'
      );
    });

    it('should not allow fetching of anomalies table data without required permissions', async () => {
      const requestBody = {
        jobIds: [JOB_CONFIG.job_id],
        criteriaFields: [{ fieldName: 'detector_index', fieldValue: 0 }],
        influencers: [],
        aggregationInterval: 'auto',
        threshold: 0,
        earliestMs: 1454889600000, // February 8, 2016 12:00:00 AM GMT
        latestMs: 1454976000000, // February 9, 2016 12:00:00 AM GMT
        dateFormatTz: 'UTC',
        maxRecords: 500,
      };
      const { body } = await supertest
        .post(`/api/ml/results/anomalies_table_data`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(404);

      expect(body.error).to.eql('Not Found');
      expect(body.message).to.eql('Not Found');
    });
  });
};
