/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';
import { mockKibanaFetchResponse } from '../../test_utils/rule_upgrade_flyout';

describe('Upgrade diffable rule "machine_learning_job_id" (machine_learning rule type) after preview in flyout', () => {
  beforeAll(() => {
    mockKibanaFetchResponse('/internal/ml/ml_capabilities', {
      capabilities: {
        isADEnabled: true,
        isDFAEnabled: true,
        isNLPEnabled: true,
        canCreateJob: true,
        canDeleteJob: true,
        canOpenJob: true,
        canCloseJob: true,
        canResetJob: true,
        canUpdateJob: true,
        canForecastJob: true,
        canDeleteForecast: true,
        canCreateDatafeed: true,
        canDeleteDatafeed: true,
        canStartStopDatafeed: true,
        canUpdateDatafeed: true,
        canPreviewDatafeed: true,
        canGetFilters: true,
        canCreateCalendar: true,
        canDeleteCalendar: true,
        canCreateFilter: true,
        canDeleteFilter: true,
        canCreateDataFrameAnalytics: true,
        canDeleteDataFrameAnalytics: true,
        canStartStopDataFrameAnalytics: true,
        canCreateMlAlerts: true,
        canUseMlAlerts: true,
        canViewMlNodes: true,
        canCreateTrainedModels: true,
        canDeleteTrainedModels: true,
        canStartStopTrainedModels: true,
        canCreateInferenceEndpoint: true,
        canGetJobs: true,
        canGetDatafeeds: true,
        canGetCalendars: true,
        canFindFileStructure: true,
        canGetDataFrameAnalytics: true,
        canGetAnnotations: true,
        canCreateAnnotation: true,
        canDeleteAnnotation: true,
        canGetTrainedModels: true,
        canTestTrainedModels: true,
        canGetFieldInfo: true,
        canGetMlInfo: true,
        canUseAiops: true,
      },
      upgradeInProgress: false,
      isPlatinumOrTrialLicense: true,
      mlFeatureEnabledInSpace: true,
    });

    mockKibanaFetchResponse('/internal/ml/jobs/jobs_summary', [
      {
        id: 'jobResolved',
        description: 'jobResolved',
        groups: [],
        jobState: 'opened',
        datafeedIndices: [],
        hasDatafeed: true,
        datafeedId: 'jobResolved',
        datafeedState: '',
        isSingleMetricViewerJob: true,
        awaitingNodeAssignment: false,
        jobTags: {},
        bucketSpanSeconds: 0,
      },
    ]);

    mockKibanaFetchResponse('/internal/ml/modules/get_module/', [
      {
        id: 'security_network',
        title: 'test-module',
        description: 'test-module',
        type: 'test-module',
        logoFile: 'test-module',
        defaultIndexPattern: 'test-module',
        query: {},
        jobs: [
          {
            id: 'jobResolved',
            config: {
              groups: [],
              description: '',
              analysis_config: {
                bucket_span: '1m',
                detectors: [],
                influencers: [],
              },
              analysis_limits: {
                model_memory_limit: '1mb',
              },
              data_description: {
                time_field: '@timestamp',
              },
              custom_settings: {
                created_by: 'test',
                custom_urls: [],
              },
              job_type: 'test',
            },
          },
        ],
        datafeeds: [],
        kibana: {},
      },
    ]);

    mockKibanaFetchResponse(
      '/internal/ml/modules/recognize/apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
      [
        {
          id: 'test-module',
          title: 'test-module',
          query: {},
          description: 'test-module',
          logo: {
            icon: 'test-module',
          },
        },
      ]
    );
  });

  const ruleType = 'machine_learning';
  const fieldName = 'machine_learning_job_id';
  const humanizedFieldName = 'Machine Learning job';
  const initial = ['jobA'];
  const customized = ['jobB'];
  const upgrade = ['jobC'];
  const resolvedValue = ['jobResolved'];

  assertRuleUpgradePreview({
    ruleType,
    fieldName,
    humanizedFieldName,
    fieldVersions: {
      initial,
      customized,
      upgrade,
      resolvedValue,
    },
  });

  assertRuleUpgradeAfterReview({
    ruleType,
    fieldName,
    fieldVersions: {
      initial,
      customized,
      upgrade,
      resolvedValue,
    },
  });
});
