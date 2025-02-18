/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FilterStats } from '@kbn/ml-plugin/common/types/filters';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  // @ts-expect-error not full interface
  const jobConfig1: Job = {
    job_id: `fq_filter_stats_1`,
    description: 'mean(responsetime) partition=airline on farequote dataset with 1h bucket span',
    groups: ['farequote', 'automated', 'multi-metric'],
    analysis_config: {
      bucket_span: '1h',
      influencers: ['airline'],
      detectors: [
        {
          function: 'mean',
          field_name: 'responsetime',
          partition_field_name: 'airline',
          detector_description: 'mean(responsetime) partitionfield=airline',
          custom_rules: [
            {
              actions: ['skip_result'],
              scope: {
                airline: {
                  filter_id: 'ignore_a_airlines',
                  filter_type: 'include',
                },
              },
            },
            {
              actions: ['skip_result'],
              scope: {
                airline: {
                  filter_id: 'ignore_b_airlines',
                  filter_type: 'include',
                },
              },
            },
          ],
        },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '20mb' },
    model_plot_config: { enabled: true },
  };

  // @ts-expect-error not full interface
  const jobConfig2: Job = {
    job_id: `fq_filter_stats_2`,
    description: 'max(responsetime) partition=airline on farequote dataset with 30m bucket span',
    groups: ['farequote', 'automated', 'multi-metric'],
    analysis_config: {
      bucket_span: '30m',
      influencers: ['airline'],
      detectors: [
        {
          function: 'max',
          field_name: 'responsetime',
          partition_field_name: 'airline',
          detector_description: 'max(responsetime) partitionfield=airline',
        },
        {
          function: 'min',
          field_name: 'responsetime',
          partition_field_name: 'airline',
          detector_description: 'min(responsetime) partitionfield=airline',
          custom_rules: [
            {
              actions: ['skip_result'],
              conditions: [
                {
                  applies_to: 'actual',
                  operator: 'lt',
                  value: 100,
                },
              ],
            },
            {
              actions: ['skip_result'],
              scope: {
                airline: {
                  filter_id: 'ignore_a_airlines',
                  filter_type: 'include',
                },
              },
            },
          ],
        },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '20mb' },
    model_plot_config: { enabled: true },
  };

  const testJobConfigs = [jobConfig1, jobConfig2];

  const testDataList = [
    {
      filterId: 'ignore_a_airlines',
      requestBody: {
        description: 'Airlines starting with A',
        items: ['AAL'],
      },
      expected: {
        item_count: 1,
        used_by: {
          jobs: [jobConfig1.job_id, jobConfig2.job_id],
          detectors: [
            `${jobConfig1.analysis_config.detectors[0].detector_description} (${jobConfig1.job_id})`,
            `${jobConfig2.analysis_config.detectors[1].detector_description} (${jobConfig2.job_id})`,
          ],
        },
      },
    },
    {
      filterId: 'ignore_b_airlines',
      requestBody: {
        description: 'Airlines starting with B',
        items: ['BAA', 'BAB'],
      },
      expected: {
        item_count: 2,
        used_by: {
          jobs: [jobConfig1.job_id],
          detectors: [
            `${jobConfig1.analysis_config.detectors[0].detector_description} (${jobConfig1.job_id})`,
          ],
        },
      },
    },
    {
      filterId: 'ignore_c_airlines',
      requestBody: {
        description: 'Airlines starting with C',
        items: ['CAA', 'CAB', 'CCC'],
      },
      expected: {
        item_count: 3,
      },
    },
  ];

  describe('get_filters_stats', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      for (const testData of testDataList) {
        const { filterId, requestBody } = testData;
        await ml.api.createFilter(filterId, requestBody);
      }

      for (const job of testJobConfigs) {
        await ml.api.createAnomalyDetectionJob(job);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it(`should fetch all filters stats`, async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/filters/_stats`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body).to.have.length(testDataList.length);

      // Validate the contents of the stats response
      for (const testData of testDataList) {
        const { filterId, expected } = testData;

        const actualFilterStats = body.find(
          (filterStats: FilterStats) => filterStats.filter_id === filterId
        );

        expect(actualFilterStats).to.have.property('item_count').eql(expected.item_count);
        if (expected.used_by !== undefined) {
          expect(actualFilterStats).to.have.property('used_by');
          expect(actualFilterStats.used_by).to.have.property('jobs');
          expect(actualFilterStats.used_by.jobs.sort()).to.eql(expected.used_by.jobs.sort());
          expect(actualFilterStats.used_by).to.have.property('detectors');
          expect(actualFilterStats.used_by.detectors.sort()).to.eql(
            expected.used_by.detectors.sort()
          );
        } else {
          expect(actualFilterStats).not.to.have.property('used_by');
        }
      }
    });

    it(`should not allow retrieving filters stats for user without required permission`, async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/filters/_stats`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
    });

    it(`should not allow retrieving filters stats for unauthorized user`, async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/filters/_stats`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
    });
  });
};
