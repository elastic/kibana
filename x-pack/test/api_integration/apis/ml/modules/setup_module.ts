/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isEmpty } from 'lodash';

import { FtrProviderContext } from '../../../ftr_provider_context';

import { JOB_STATE, DATAFEED_STATE } from '../../../../../plugins/ml/common/constants/states';
import { Job } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataListPositive = [
    {
      testTitleSuffix:
        'for sample_data_weblogs with prefix, startDatafeed false and estimateModelMemory false',
      sourceDataArchive: 'ml/module_sample_logs',
      indexPattern: { name: 'ft_module_sample_logs', timeField: '@timestamp' },
      module: 'sample_data_weblogs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf1_',
        indexPatternName: 'ft_module_sample_logs',
        startDatafeed: false,
        estimateModelMemory: false,
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf1_low_request_rate',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '10mb',
          },
          {
            jobId: 'pf1_response_code_rates',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '10mb',
          },
          {
            jobId: 'pf1_url_scanning',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '10mb',
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for sample_data_weblogs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_sample_logs',
      indexPattern: { name: 'ft_module_sample_logs', timeField: '@timestamp' },
      module: 'sample_data_weblogs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf2_',
        indexPatternName: 'ft_module_sample_logs',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf2_low_request_rate',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf2_response_code_rates',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf2_url_scanning',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '16mb',
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for apache_ecs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_apache',
      indexPattern: { name: 'ft_module_apache', timeField: '@timestamp' },
      module: 'apache_ecs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf3_',
        indexPatternName: 'ft_module_apache',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf3_low_request_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf3_source_ip_request_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf3_source_ip_url_count_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '16mb',
          },
          {
            jobId: 'pf3_status_code_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf3_visitor_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
        ],
        searches: ['ml_http_access_filebeat_ecs'] as string[],
        visualizations: [
          'ml_http_access_map_ecs',
          'ml_http_access_source_ip_timechart_ecs',
          'ml_http_access_status_code_timechart_ecs',
          'ml_http_access_top_source_ips_table_ecs',
          'ml_http_access_top_urls_table_ecs',
          'ml_http_access_unique_count_url_timechart_ecs',
          'ml_http_access_events_timechart_ecs',
        ] as string[],
        dashboards: ['ml_http_access_explorer_ecs'] as string[],
      },
    },
    {
      testTitleSuffix:
        'for apm_nodejs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_apm',
      indexPattern: { name: 'ft_module_apm', timeField: '@timestamp' },
      module: 'apm_nodejs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf4_',
        indexPatternName: 'ft_module_apm',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf4_abnormal_span_durations_nodejs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf4_abnormal_trace_durations_nodejs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf4_decreased_throughput_nodejs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for apm_transaction with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_apm',
      indexPattern: { name: 'ft_module_apm', timeField: '@timestamp' },
      module: 'apm_transaction',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf5_',
        indexPatternName: 'ft_module_apm',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf5_high_mean_transaction_duration',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for logs_ui_analysis with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_logs',
      indexPattern: { name: 'ft_module_logs', timeField: '@timestamp' },
      module: 'logs_ui_analysis',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf6_',
        indexPatternName: 'ft_module_logs',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf6_log-entry-rate',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for logs_ui_categories with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_logs',
      indexPattern: { name: 'ft_module_logs', timeField: '@timestamp' },
      module: 'logs_ui_categories',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf7_',
        indexPatternName: 'ft_module_logs',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf7_log-entry-categories-count',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '26mb',
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix: 'for nginx_ecs with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_nginx',
      indexPattern: { name: 'ft_module_nginx', timeField: '@timestamp' },
      module: 'nginx_ecs',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf8_',
        indexPatternName: 'ft_module_nginx',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf8_visitor_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf8_status_code_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf8_source_ip_url_count_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '16mb',
          },
          {
            jobId: 'pf8_source_ip_request_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf8_low_request_rate_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
        ],
        searches: ['ml_http_access_filebeat_ecs'] as string[],
        visualizations: [
          'ml_http_access_map_ecs',
          'ml_http_access_source_ip_timechart_ecs',
          'ml_http_access_status_code_timechart_ecs',
          'ml_http_access_top_source_ips_table_ecs',
          'ml_http_access_top_urls_table_ecs',
          'ml_http_access_unique_count_url_timechart_ecs',
          'ml_http_access_events_timechart_ecs',
        ] as string[],
        dashboards: ['ml_http_access_explorer_ecs'] as string[],
      },
    },
    {
      testTitleSuffix:
        'for sample_data_ecommerce with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_sample_ecommerce',
      indexPattern: { name: 'ft_module_sample_ecommerce', timeField: 'order_date' },
      module: 'sample_data_ecommerce',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf9_',
        indexPatternName: 'ft_module_sample_ecommerce',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf9_high_sum_total_sales',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for siem_auditbeat_auth with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_siem_auditbeat',
      indexPattern: { name: 'ft_module_siem_auditbeat', timeField: '@timestamp' },
      module: 'siem_auditbeat_auth',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf11_',
        indexPatternName: 'ft_module_siem_auditbeat',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf11_suspicious_login_activity_ecs',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
    {
      testTitleSuffix:
        'for siem_packetbeat with prefix, startDatafeed true and estimateModelMemory true',
      sourceDataArchive: 'ml/module_siem_packetbeat',
      indexPattern: { name: 'ft_module_siem_packetbeat', timeField: '@timestamp' },
      module: 'siem_packetbeat',
      user: USER.ML_POWERUSER,
      requestBody: {
        prefix: 'pf12_',
        indexPatternName: 'ft_module_siem_packetbeat',
        startDatafeed: true,
        end: Date.now(),
      },
      expected: {
        responseCode: 200,
        jobs: [
          {
            jobId: 'pf12_packetbeat_dns_tunneling',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '16mb',
          },
          {
            jobId: 'pf12_packetbeat_rare_dns_question',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf12_packetbeat_rare_server_domain',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf12_packetbeat_rare_urls',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
          {
            jobId: 'pf12_packetbeat_rare_user_agent',
            jobState: JOB_STATE.CLOSED,
            datafeedState: DATAFEED_STATE.STOPPED,
            modelMemoryLimit: '11mb',
          },
        ],
        searches: [] as string[],
        visualizations: [] as string[],
        dashboards: [] as string[],
      },
    },
  ];

  const testDataListNegative = [
    {
      testTitleSuffix: 'for non existent index pattern',
      module: 'sample_data_weblogs',
      user: USER.ML_POWERUSER,
      requestBody: {
        indexPatternName: 'non-existent-index-pattern',
        startDatafeed: false,
      },
      expected: {
        responseCode: 400,
        error: 'Bad Request',
        message:
          "Module's jobs contain custom URLs which require a kibana index pattern (non-existent-index-pattern) which cannot be found.",
      },
    },
    {
      testTitleSuffix: 'for unauthorized user',
      sourceDataArchive: 'ml/module_sample_logs',
      indexPattern: { name: 'ft_module_sample_logs', timeField: '@timestamp' },
      module: 'sample_data_weblogs',
      user: USER.ML_UNAUTHORIZED,
      requestBody: {
        prefix: 'pfn1_',
        indexPatternName: 'ft_module_sample_logs',
        startDatafeed: false,
      },
      expected: {
        responseCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      },
    },
  ];

  async function executeSetupModuleRequest(
    module: string,
    user: USER,
    rqBody: object,
    rspCode: number
  ) {
    const { body } = await supertest
      .post(`/api/ml/modules/setup/${module}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(rqBody)
      .expect(rspCode);

    return body;
  }

  function compareById(a: { id: string }, b: { id: string }) {
    if (a.id < b.id) {
      return -1;
    }
    if (a.id > b.id) {
      return 1;
    }
    return 0;
  }

  function mapIdsToSuccessObjects(ids: string[]) {
    const successObjects = ids
      .map((id) => {
        return { id, success: true };
      })
      .sort(compareById);

    return successObjects;
  }

  describe('module setup', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    for (const testData of testDataListPositive) {
      describe('sets up module data', function () {
        before(async () => {
          await esArchiver.loadIfNeeded(testData.sourceDataArchive);
          await ml.testResources.createIndexPatternIfNeeded(
            testData.indexPattern.name,
            testData.indexPattern.timeField
          );
        });

        after(async () => {
          for (const search of testData.expected.searches) {
            await ml.testResources.deleteSavedSearchById(search);
          }
          for (const visualization of testData.expected.visualizations) {
            await ml.testResources.deleteVisualizationById(visualization);
          }
          for (const dashboard of testData.expected.dashboards) {
            await ml.testResources.deleteDashboardById(dashboard);
          }
          await ml.api.cleanMlIndices();
        });

        it(testData.testTitleSuffix, async () => {
          const rspBody = await executeSetupModuleRequest(
            testData.module,
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          // verify response
          if (testData.expected.jobs.length > 0) {
            // jobs
            expect(rspBody).to.have.property('jobs');

            const expectedJobIds = testData.expected.jobs.map((job) => job.jobId);
            const expectedRspJobs = mapIdsToSuccessObjects(expectedJobIds);

            const actualRspJobs = rspBody.jobs.sort(compareById);

            expect(actualRspJobs).to.eql(
              expectedRspJobs,
              `Expected setup module response jobs to be '${JSON.stringify(
                expectedRspJobs
              )}' (got '${JSON.stringify(actualRspJobs)}')`
            );

            // datafeeds
            expect(rspBody).to.have.property('datafeeds');

            const expectedRspDatafeeds = testData.expected.jobs
              .map((job) => {
                return {
                  id: `datafeed-${job.jobId}`,
                  success: true,
                  started: testData.requestBody.startDatafeed,
                };
              })
              .sort(compareById);

            const actualRspDatafeeds = rspBody.datafeeds.sort(compareById);

            expect(actualRspDatafeeds).to.eql(
              expectedRspDatafeeds,
              `Expected setup module response datafeeds to be '${JSON.stringify(
                expectedRspDatafeeds
              )}' (got '${JSON.stringify(actualRspDatafeeds)}')`
            );

            // saved objects
            const rspKibana: object = rspBody.kibana;
            let actualSearches = [];
            let actualVisualizations = [];
            let actualDashboards = [];

            if (isEmpty(rspKibana) === false) {
              actualSearches = rspBody.kibana.search.sort(compareById);
              actualVisualizations = rspBody.kibana.visualization.sort(compareById);
              actualDashboards = rspBody.kibana.dashboard.sort(compareById);
            }

            const expectedSearches = mapIdsToSuccessObjects(testData.expected.searches);
            const expectedVisualizations = mapIdsToSuccessObjects(testData.expected.visualizations);
            const expectedDashboards = mapIdsToSuccessObjects(testData.expected.dashboards);

            expect(actualSearches).to.eql(
              expectedSearches,
              `Expected setup module response searches to be '${JSON.stringify(
                expectedSearches
              )}' (got '${JSON.stringify(actualSearches)}')`
            );

            expect(actualVisualizations).to.eql(
              expectedVisualizations,
              `Expected setup module response visualizations to be '${JSON.stringify(
                expectedVisualizations
              )}' (got '${JSON.stringify(actualVisualizations)}')`
            );

            expect(actualDashboards).to.eql(
              expectedDashboards,
              `Expected setup module response dashboards to be '${JSON.stringify(
                expectedDashboards
              )}' (got '${JSON.stringify(actualDashboards)}')`
            );
          }

          // verify job and datafeed creation + states
          for (const job of testData.expected.jobs) {
            const datafeedId = `datafeed-${job.jobId}`;
            await ml.api.waitForAnomalyDetectionJobToExist(job.jobId);
            await ml.api.waitForDatafeedToExist(datafeedId);
            if (testData.requestBody.startDatafeed === true) {
              await ml.api.waitForADJobRecordCountToBePositive(job.jobId);
            }
            await ml.api.waitForJobState(job.jobId, job.jobState);
            await ml.api.waitForDatafeedState(datafeedId, job.datafeedState);
          }

          // compare model memory limits for created jobs
          const expectedModelMemoryLimits = testData.expected.jobs
            .map((j) => ({
              id: j.jobId,
              modelMemoryLimit: j.modelMemoryLimit,
            }))
            .sort(compareById);

          const {
            body: { jobs },
          }: {
            body: {
              jobs: Job[];
            };
          } = await ml.api.getAnomalyDetectionJob(
            testData.expected.jobs.map((j) => j.jobId).join()
          );

          const actualModelMemoryLimits = jobs
            .map((j) => ({
              id: j.job_id,
              modelMemoryLimit: j.analysis_limits!.model_memory_limit,
            }))
            .sort(compareById);

          expect(actualModelMemoryLimits).to.eql(
            expectedModelMemoryLimits,
            `Expected job model memory limits '${JSON.stringify(
              expectedModelMemoryLimits
            )}' (got '${JSON.stringify(actualModelMemoryLimits)}')`
          );

          // verify saved objects creation
          for (const search of testData.expected.searches) {
            await ml.testResources.assertSavedSearchExistById(search);
          }
          for (const visualization of testData.expected.visualizations) {
            await ml.testResources.assertVisualizationExistById(visualization);
          }
          for (const dashboard of testData.expected.dashboards) {
            await ml.testResources.assertDashboardExistById(dashboard);
          }
        });
      });
    }

    for (const testData of testDataListNegative) {
      describe('rejects request', function () {
        before(async () => {
          if (testData.hasOwnProperty('sourceDataArchive')) {
            await esArchiver.loadIfNeeded(testData.sourceDataArchive!);
          }
          if (testData.hasOwnProperty('indexPattern')) {
            await ml.testResources.createIndexPatternIfNeeded(
              testData.indexPattern!.name as string,
              testData.indexPattern!.timeField as string
            );
          }
        });

        after(async () => {
          await ml.api.cleanMlIndices();
        });

        it(testData.testTitleSuffix, async () => {
          const rspBody = await executeSetupModuleRequest(
            testData.module,
            testData.user,
            testData.requestBody,
            testData.expected.responseCode
          );

          expect(rspBody).to.have.property('error').eql(testData.expected.error);

          expect(rspBody).to.have.property('message').eql(testData.expected.message);
        });
      });
    }
  });
};
