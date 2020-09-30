/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import pkg from '../../../../../../package.json';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('Validate job', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ecommerce');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it(`should recognize a valid job configuration`, async () => {
      const requestBody = {
        duration: { start: 1586995459000, end: 1589672736000 },
        job: {
          job_id: 'test',
          description: '',
          groups: [],
          analysis_config: {
            bucket_span: '15m',
            detectors: [{ function: 'mean', field_name: 'products.discount_amount' }],
            influencers: [],
            summary_count_field_name: 'doc_count',
          },
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '11MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(200);

      expect(body).to.eql([
        {
          id: 'job_id_valid',
          heading: 'Job ID format is valid',
          text:
            'Lowercase alphanumeric (a-z and 0-9) characters, hyphens or underscores, starts and ends with an alphanumeric character, and is no more than 64 characters long.',
          url: `https://www.elastic.co/guide/en/elasticsearch/reference/${pkg.branch}/ml-job-resource.html#ml-job-resource`,
          status: 'success',
        },
        {
          id: 'detectors_function_not_empty',
          heading: 'Detector functions',
          text: 'Presence of detector functions validated in all detectors.',
          url: `https://www.elastic.co/guide/en/machine-learning/${pkg.branch}/create-jobs.html#detectors`,
          status: 'success',
        },
        {
          id: 'success_bucket_span',
          bucketSpan: '15m',
          heading: 'Bucket span',
          text: 'Format of "15m" is valid and passed validation checks.',
          url: `https://www.elastic.co/guide/en/machine-learning/${pkg.branch}/create-jobs.html#bucket-span`,
          status: 'success',
        },
        {
          id: 'success_time_range',
          heading: 'Time range',
          text: 'Valid and long enough to model patterns in the data.',
          status: 'success',
        },
        {
          id: 'success_mml',
          heading: 'Model memory limit',
          text: 'Valid and within the estimated model memory limit.',
          url: `https://www.elastic.co/guide/en/machine-learning/${pkg.branch}/create-jobs.html#model-memory-limits`,
          status: 'success',
        },
      ]);
    });

    it('should recognize a basic invalid job configuration and skip advanced checks', async () => {
      const requestBody = {
        duration: { start: 1586995459000, end: 1589672736000 },
        job: {
          job_id: '-(*&^',
          description: '',
          groups: [],
          analysis_config: {
            bucket_span: '15m',
            detectors: [{ function: 'mean', field_name: 'products.discount_amount' }],
            influencers: [],
            summary_count_field_name: 'doc_count',
          },
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '11MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(200);

      expect(body).to.eql([
        {
          id: 'job_id_invalid',
          text:
            'Job ID is invalid. It can contain lowercase alphanumeric (a-z and 0-9) characters, hyphens or underscores and must start and end with an alphanumeric character.',
          url: `https://www.elastic.co/guide/en/elasticsearch/reference/${pkg.branch}/ml-job-resource.html#ml-job-resource`,
          status: 'error',
        },
        {
          id: 'detectors_function_not_empty',
          heading: 'Detector functions',
          text: 'Presence of detector functions validated in all detectors.',
          url: `https://www.elastic.co/guide/en/machine-learning/${pkg.branch}/create-jobs.html#detectors`,
          status: 'success',
        },
        {
          id: 'bucket_span_valid',
          bucketSpan: '15m',
          heading: 'Bucket span',
          text: 'Format of "15m" is valid.',
          url: `https://www.elastic.co/guide/en/elasticsearch/reference/${pkg.branch}/ml-job-resource.html#ml-analysisconfig`,
          status: 'success',
        },
        {
          id: 'skipped_extended_tests',
          text:
            'Skipped additional checks because the basic requirements of the job configuration were not met.',
          status: 'warning',
        },
      ]);
    });

    it('should recognize non-basic issues in job configuration', async () => {
      const requestBody = {
        duration: { start: 1586995459000, end: 1589672736000 },
        job: {
          job_id: 'test',
          description: '',
          groups: [],
          analysis_config: {
            bucket_span: '1000000m',
            detectors: [
              {
                function: 'mean',
                field_name: 'products.base_price',
                // some high cardinality field
                partition_field_name: 'order_id',
              },
            ],
            influencers: ['order_id'],
          },
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '1MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(200);

      // The existance and value of maxModelMemoryLimit depends on ES settings
      // and may vary between test environments, e.g. cloud vs non-cloud,
      // so it should not be part of the validation
      body.forEach((element: any) => {
        if (element.hasOwnProperty('maxModelMemoryLimit')) {
          delete element.maxModelMemoryLimit;
        }
      });

      expect(body).to.eql([
        {
          id: 'job_id_valid',
          heading: 'Job ID format is valid',
          text:
            'Lowercase alphanumeric (a-z and 0-9) characters, hyphens or underscores, starts and ends with an alphanumeric character, and is no more than 64 characters long.',
          url: `https://www.elastic.co/guide/en/elasticsearch/reference/${pkg.branch}/ml-job-resource.html#ml-job-resource`,
          status: 'success',
        },
        {
          id: 'detectors_function_not_empty',
          heading: 'Detector functions',
          text: 'Presence of detector functions validated in all detectors.',
          url: `https://www.elastic.co/guide/en/machine-learning/${pkg.branch}/create-jobs.html#detectors`,
          status: 'success',
        },
        {
          id: 'cardinality_model_plot_high',
          modelPlotCardinality: 4711,
          text:
            'The estimated cardinality of 4711 of fields relevant to creating model plots might result in resource intensive jobs.',
          status: 'warning',
        },
        {
          id: 'cardinality_partition_field',
          fieldName: 'order_id',
          text:
            'Cardinality of partition_field "order_id" is above 1000 and might result in high memory usage.',
          url: `https://www.elastic.co/guide/en/machine-learning/${pkg.branch}/create-jobs.html#cardinality`,
          status: 'warning',
        },
        {
          id: 'bucket_span_high',
          heading: 'Bucket span',
          text:
            'Bucket span is 1 day or more. Be aware that days are considered as UTC days, not local days.',
          url: `https://www.elastic.co/guide/en/machine-learning/${pkg.branch}/create-jobs.html#bucket-span`,
          status: 'info',
        },
        {
          bucketSpanCompareFactor: 25,
          id: 'time_range_short',
          minTimeSpanReadable: '2 hours',
          heading: 'Time range',
          text:
            'The selected or available time range might be too short. The recommended minimum time range should be at least 2 hours and 25 times the bucket span.',
          status: 'warning',
        },
        {
          id: 'success_influencers',
          text: 'Influencer configuration passed the validation checks.',
          url: `https://www.elastic.co/guide/en/machine-learning/${pkg.branch}/ml-influencers.html`,
          status: 'success',
        },
        {
          id: 'half_estimated_mml_greater_than_mml',
          mml: '1MB',
          text:
            'The specified model memory limit is less than half of the estimated model memory limit and will likely hit the hard limit.',
          url: `https://www.elastic.co/guide/en/machine-learning/${pkg.branch}/create-jobs.html#model-memory-limits`,
          status: 'warning',
        },
      ]);
    });

    it('should not validate configuration in case request payload is invalid', async () => {
      const requestBody = {
        duration: { start: 1586995459000, end: 1589672736000 },
        job: {
          job_id: 'test',
          description: '',
          groups: [],
          // missing analysis_config
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '11MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(400);

      expect(body.error).to.eql('Bad Request');
      expect(body.message).to.eql(
        '[request body.job.analysis_config.detectors]: expected value of type [array] but got [undefined]'
      );
    });

    it('should not validate if the user does not have required permissions', async () => {
      const requestBody = {
        job: {
          job_id: 'test',
          description: '',
          groups: [],
          analysis_config: {
            bucket_span: '15m',
            detectors: [{ function: 'mean', field_name: 'products.discount_amount' }],
            influencers: [],
            summary_count_field_name: 'doc_count',
          },
          data_description: { time_field: 'order_date' },
          analysis_limits: { model_memory_limit: '11MB' },
          model_plot_config: { enabled: true },
          datafeed_config: {
            datafeed_id: 'datafeed-test',
            job_id: 'test',
            indices: ['ft_ecommerce'],
            query: { bool: { must: [{ match_all: {} }], filter: [], must_not: [] } },
            aggregations: {
              buckets: {
                date_histogram: { field: 'order_date', fixed_interval: '90000ms' },
                aggregations: {
                  'products.discount_amount': { avg: { field: 'products.discount_amount' } },
                  order_date: { max: { field: 'order_date' } },
                },
              },
            },
          },
        },
      };

      const { body } = await supertest
        .post('/api/ml/validate/job')
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(404);

      expect(body.error).to.eql('Not Found');
      expect(body.message).to.eql('Not Found');
    });
  });
};
