/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Datafeed, Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import type { PartitionFieldValueResponse } from '@kbn/ml-plugin/server/models/results_service/get_partition_fields_values';
import { USER } from '../../../../functional/services/ml/security_common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  function getJobConfig(jobId: string, enableModelPlot = true) {
    return {
      job_id: jobId,
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
      model_plot_config: { enabled: enableModelPlot },
    } as Job;
  }

  function getDatafeedConfig(jobId: string) {
    return {
      datafeed_id: `datafeed-${jobId}`,
      indices: ['ft_farequote'],
      job_id: jobId,
      query: { bool: { must: [{ match_all: {} }] } },
    } as Datafeed;
  }

  async function createMockJobs() {
    await ml.api.createAndRunAnomalyDetectionLookbackJob(
      getJobConfig('fq_multi_1_ae'),
      getDatafeedConfig('fq_multi_1_ae')
    );

    await ml.api.createAndRunAnomalyDetectionLookbackJob(
      getJobConfig('fq_multi_2_ae', false),
      getDatafeedConfig('fq_multi_2_ae')
    );
  }

  async function runRequest(requestBody: object): Promise<PartitionFieldValueResponse> {
    const { body, status } = await supertest
      .post(`/api/ml/results/partition_fields_values`)
      .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody);
    ml.api.assertResponseStatusCode(200, status, body);
    return body;
  }

  describe('PartitionFieldsValues', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createMockJobs();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('when model plot is enabled', () => {
      it('should fetch anomalous only field values within the time range with an empty search term sorting by anomaly score', async () => {
        const requestBody = {
          jobId: 'fq_multi_1_ae',
          criteriaFields: [{ fieldName: 'detector_index', fieldValue: 0 }],
          earliestMs: 1454889600000, // February 8, 2016 12:00:00 AM GMT
          latestMs: 1454976000000, // February 9, 2016 12:00:00 AM GMT,
          searchTerm: {},
          fieldsConfig: {
            partition_field: {
              applyTimeRange: true,
              anomalousOnly: true,
              sort: { by: 'anomaly_score', order: 'desc' },
            },
          },
        };

        const body = await runRequest(requestBody);

        expect(body.partition_field.name).to.eql('airline');
        expect(body.partition_field.values.length).to.eql(6);
        expect(body.partition_field.values[0].value).to.eql('ACA');
        expect(body.partition_field.values[0].maxRecordScore).to.be.above(0);
        expect(body.partition_field.values[1].value).to.eql('JBU');
        expect(body.partition_field.values[1].maxRecordScore).to.be.above(0);
        expect(body.partition_field.values[2].value).to.eql('SWR');
        expect(body.partition_field.values[2].maxRecordScore).to.be.above(0);
        expect(body.partition_field.values[3].value).to.eql('BAW');
        expect(body.partition_field.values[3].maxRecordScore).to.be.above(0);
        expect(body.partition_field.values[4].value).to.eql('TRS');
        expect(body.partition_field.values[4].maxRecordScore).to.be.above(0);
        expect(body.partition_field.values[5].value).to.eql('EGF');
        expect(body.partition_field.values[5].maxRecordScore).to.be.above(0);
      });

      it('should fetch all values withing the time range sorting by name', async () => {
        const requestBody = {
          jobId: 'fq_multi_1_ae',
          criteriaFields: [{ fieldName: 'detector_index', fieldValue: 0 }],
          earliestMs: 1454889600000, // February 8, 2016 12:00:00 AM GMT
          latestMs: 1454976000000, // February 9, 2016 12:00:00 AM GMT,
          searchTerm: {},
          fieldsConfig: {
            partition_field: {
              applyTimeRange: true,
              anomalousOnly: false,
              sort: { by: 'name', order: 'asc' },
            },
          },
        };

        const body = await runRequest(requestBody);

        expect(body).to.eql({
          partition_field: {
            name: 'airline',
            values: [
              { value: 'AAL' },
              { value: 'ACA' },
              { value: 'AMX' },
              { value: 'ASA' },
              { value: 'AWE' },
              { value: 'BAW' },
              { value: 'DAL' },
              { value: 'EGF' },
              { value: 'FFT' },
              { value: 'JAL' },
              { value: 'JBU' },
              { value: 'JZA' },
              { value: 'KLM' },
              { value: 'NKS' },
              { value: 'SWA' },
              { value: 'SWR' },
              { value: 'TRS' },
              { value: 'UAL' },
              { value: 'VRD' },
            ],
          },
        });
      });

      it('should fetch anomalous only field value applying the search term', async () => {
        const requestBody = {
          jobId: 'fq_multi_1_ae',
          criteriaFields: [{ fieldName: 'detector_index', fieldValue: 0 }],
          earliestMs: 1454889600000, // February 8, 2016 12:00:00 AM GMT
          latestMs: 1454976000000, // February 9, 2016 12:00:00 AM GMT,
          searchTerm: {
            partition_field: 'JB',
          },
          fieldsConfig: {
            partition_field: {
              applyTimeRange: true,
              anomalousOnly: true,
              sort: { by: 'anomaly_score', order: 'asc' },
            },
          },
        };

        const body = await runRequest(requestBody);

        expect(body.partition_field.name).to.eql('airline');
        expect(body.partition_field.values.length).to.eql(1);
        expect(body.partition_field.values[0].value).to.eql('JBU');
        expect(body.partition_field.values[0].maxRecordScore).to.be.above(0);
      });
    });

    describe('when model plot is disabled', () => {
      it('should fetch results within the time range', async () => {
        const requestBody = {
          jobId: 'fq_multi_2_ae',
          criteriaFields: [{ fieldName: 'detector_index', fieldValue: 0 }],
          earliestMs: 1454889600000, // February 8, 2016 12:00:00 AM GMT
          latestMs: 1454976000000, // February 9, 2016 12:00:00 AM GMT,
          searchTerm: {},
          fieldsConfig: {
            partition_field: {
              applyTimeRange: true,
              anomalousOnly: false,
              sort: { by: 'name', order: 'asc' },
            },
          },
        };

        const body = await runRequest(requestBody);
        expect(body.partition_field.values.length).to.eql(6);
      });

      it('should fetch results outside the time range', async () => {
        const requestBody = {
          jobId: 'fq_multi_2_ae',
          criteriaFields: [{ fieldName: 'detector_index', fieldValue: 0 }],
          earliestMs: 1454889600000, // February 8, 2016 12:00:00 AM GMT
          latestMs: 1454976000000, // February 9, 2016 12:00:00 AM GMT,
          searchTerm: {},
          fieldsConfig: {
            partition_field: {
              applyTimeRange: false,
              anomalousOnly: false,
              sort: { by: 'name', order: 'asc' },
            },
          },
        };

        const body = await runRequest(requestBody);
        expect(body.partition_field.values.length).to.eql(19);
      });
    });
  });
};
