/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { SINGLE_DATASET_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { AWSIndexName } from '../../../../common/aws_firehose';
import { ObservabilityOnboardingContextValue } from '../../../plugin';

export interface AWSServiceGetStartedConfig {
  id: string;
  indexNameList: AWSIndexName[];
  title: string;
  logoURL: string;
  previewImage?: string;
  actionLinks: Array<{
    id: string;
    title: string;
    label: string;
    href: string;
  }>;
}

export function useAWSServiceGetStartedList(): AWSServiceGetStartedConfig[] {
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingContextValue>();
  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const singleDatasetLocator = share.url.locators.get(SINGLE_DATASET_LOCATOR_ID);
  const discoverLocator = share.url.locators.get(DISCOVER_APP_LOCATOR);

  const generateMetricsDashboardActionLink = useCallback(
    (dashboardId: string, name?: string) => ({
      id: `dashboard-${dashboardId}`,
      title: i18n.translate(
        'xpack.observability_onboarding.firehosePanel.exploreMetricsDataTitle',
        {
          defaultMessage: 'Overview{name} metrics data with this pre-made dashboard',
          values: { name: name ? ` ${name}` : '' },
        }
      ),
      label: i18n.translate(
        'xpack.observability_onboarding.firehosePanel.exploreMetricsDataLabel',
        {
          defaultMessage: 'Explore metrics data',
        }
      ),
      href:
        dashboardLocator?.getRedirectUrl({
          dashboardId,
        }) ?? '',
    }),
    [dashboardLocator]
  );

  const generateLogsDashboardActionLink = useCallback(
    (dashboardId: string) => ({
      id: `dashboard-${dashboardId}`,
      title: i18n.translate('xpack.observability_onboarding.firehosePanel.exploreLogsDataTitle', {
        defaultMessage: 'Overview your logs data with this pre-made dashboard',
      }),
      label: i18n.translate('xpack.observability_onboarding.firehosePanel.exploreLogsDataLabel', {
        defaultMessage: 'Explore logs data',
      }),
      href:
        dashboardLocator?.getRedirectUrl({
          dashboardId,
        }) ?? '',
    }),
    [dashboardLocator]
  );

  const generateLogsExplorerActionLink = useCallback(
    (dataset: string, name: string) => ({
      id: `logs-explorer-${dataset}`,
      title: i18n.translate('xpack.observability_onboarding.firehosePanel.exploreDataTitle', {
        defaultMessage: 'See {name} data in Logs Explorer',
        values: { name },
      }),
      label: i18n.translate('xpack.observability_onboarding.firehosePanel.exploreDataLabel', {
        defaultMessage: 'Explore',
      }),
      href:
        singleDatasetLocator?.getRedirectUrl({
          integration: 'AWS',
          dataset,
        }) ?? '',
    }),
    [singleDatasetLocator]
  );

  const generateMetricsDiscoverActionLink = useCallback(
    (namespace: string, name: string) => ({
      id: `discover-${namespace}`,
      title: i18n.translate('xpack.observability_onboarding.firehosePanel.exploreDataTitle', {
        defaultMessage: 'See {name} metrics data in Discover',
        values: { name },
      }),
      label: i18n.translate('xpack.observability_onboarding.firehosePanel.exploreDataLabel', {
        defaultMessage: 'Explore',
      }),
      href:
        discoverLocator?.getRedirectUrl({
          dataViewId: `metrics-*`,
          query: {
            query: `aws.cloudwatch.namespace: ${namespace}`,
            language: 'kuery',
          },
        }) ?? '',
    }),
    [discoverLocator]
  );

  return useMemo(
    () => [
      {
        id: 'vpc-flow',
        indexNameList: ['logs-aws.vpcflow'],
        title: 'VPC',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_vpcflow.svg',
        actionLinks: [generateLogsDashboardActionLink('aws-15503340-4488-11ea-ad63-791a5dc86f10')],
      },
      {
        id: 'api-gateway',
        indexNameList: ['logs-aws.apigateway_logs', 'metrics-aws.apigateway_metrics'],
        title: 'API Gateway',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_apigateway.svg',
        actionLinks: [
          generateLogsDashboardActionLink('aws-5465f0f0-26e4-11ee-9051-011d57d86fe2'),
          generateMetricsDashboardActionLink('aws-bff88770-56d6-11ee-893f-c96e4c6c871e'),
        ],
      },
      {
        id: 'cloudtrail',
        indexNameList: ['logs-aws.cloudtrail'],
        title: 'CloudTrail',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_cloudtrail.svg',
        actionLinks: [generateLogsDashboardActionLink('aws-9c09cd20-7399-11ea-a345-f985c61fe654')],
      },
      {
        id: 'firewall',
        indexNameList: ['logs-aws.firewall_logs'],
        title: 'Network Firewall',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_firewall.svg',
        actionLinks: [
          generateLogsDashboardActionLink('aws-2ba11b50-4b9d-11ec-8282-5342b8988acc'),
          generateMetricsDashboardActionLink('aws-3abffe60-4ba9-11ec-8282-5342b8988acc'),
        ],
      },
      {
        id: 'route53',
        indexNameList: ['logs-aws.route53_public_logs', 'logs-aws.route53_resolver_logs'],
        title: 'Route53',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_route53.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateLogsExplorerActionLink('route53_public_logs', 'Route53 public'),
          generateLogsExplorerActionLink('route53_resolver_logs', 'Route53 resolver'),
        ],
      },
      {
        id: 'waf',
        indexNameList: ['logs-aws.waf'],
        title: 'WAF',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_waf.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [generateLogsExplorerActionLink('waf', 'WAF')],
      },
      {
        id: 'dynamodb',
        indexNameList: ['metrics-aws.dynamodb'],
        title: 'DynamoDB',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_dynamodb.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-68ba7bd0-20b6-11ea-8f72-2f8d21e50b0c'),
        ],
      },
      {
        id: 'ebs',
        indexNameList: ['metrics-aws.ebs'],
        title: 'EBS',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_ebs.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-44ce4680-b7ba-11e9-8349-f15f850c5cd0'),
        ],
      },
      {
        id: 'ec2',
        indexNameList: ['metrics-aws.ec2_metrics'],
        title: 'EC2',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_ec2.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-c5846400-f7fb-11e8-af03-c999c9dea608'),
        ],
      },
      {
        id: 'ecs',
        indexNameList: ['metrics-aws.ecs_metrics'],
        title: 'ECS',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_ecs.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [generateMetricsDiscoverActionLink('AWS/ECS', 'ECS')],
      },
      {
        id: 'elb',
        indexNameList: ['metrics-aws.elb_metrics'],
        title: 'ELB',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_elb.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-e74bf320-b3ce-11e9-87a4-078dbbae220d'),
        ],
      },
      {
        id: 'emr',
        indexNameList: ['metrics-aws.emr_metrics'],
        title: 'EMR',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_emr.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-98f85120-0ea4-11ee-9c37-e55025c0278a'),
        ],
      },
      {
        id: 'msk',
        indexNameList: ['metrics-aws.kafka_metrics'],
        title: 'MSK',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_msk.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-62d43b00-d10d-11ee-b93f-db5ae1f208de'),
        ],
      },
      {
        id: 'kinesis',
        indexNameList: ['metrics-aws.kinesis'],
        title: 'Kinesis Data Stream',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_kinesis.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-07d67a60-d872-11eb-8220-c9141cc1b15c'),
        ],
      },
      {
        id: 'lambda',
        indexNameList: ['metrics-aws.lambda'],
        title: 'Lambda',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_lambda.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-7ac8e1d0-28d2-11ea-ba6c-49a884eb104f'),
        ],
      },
      {
        id: 'nat-gateway',
        indexNameList: ['metrics-aws.natgateway'],
        title: 'NAT Gateway',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_natgateway.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-c2b1cbc0-6891-11ea-b0ac-95d4ecb1fecd'),
        ],
      },
      {
        id: 'rds',
        indexNameList: ['metrics-aws.rds'],
        title: 'RDS',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_rds.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-3367c170-921f-11e9-aa19-159bf182e06f'),
        ],
      },
      {
        id: 's3',
        indexNameList: [
          'metrics-aws.s3_storage_lens',
          'metrics-aws.s3_daily_storage',
          'metrics-aws.s3_request',
        ],
        title: 'S3',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_s3.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink(
            'aws-80ed1380-41a6-11ec-a605-bff67d9b7872',
            'S3 Storage Lens'
          ),
          generateMetricsDiscoverActionLink('AWS/S3', 'S3'),
        ],
      },
      {
        id: 'sns',
        indexNameList: ['metrics-aws.sns'],
        title: 'SNS',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_sns.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-d17b1000-17a4-11ea-8e91-03c7047cbb9d'),
        ],
      },
      {
        id: 'sqs',
        indexNameList: ['metrics-aws.sqs'],
        title: 'SQS',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_sqs.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-234aeda0-43b7-11e9-8697-530f39afc6eb'),
        ],
      },
      {
        id: 'transitgateway',
        indexNameList: ['metrics-aws.transitgateway'],
        title: 'Transit Gateway',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_transitgateway.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-0eb5a6a0-694f-11ea-b0ac-95d4ecb1fecd'),
        ],
      },
      {
        id: 'usage',
        indexNameList: ['metrics-aws.usage'],
        title: 'AWS Usage',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_aws.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-917a07b0-178e-11ea-8650-fb606deb5be4'),
        ],
      },
      {
        id: 'vpn',
        indexNameList: ['metrics-aws.vpn'],
        title: 'VPN',
        logoURL: 'https://epr.elastic.co/package/aws/2.23.0/img/logo_vpn.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          generateMetricsDashboardActionLink('aws-67c9f900-693e-11ea-b0ac-95d4ecb1fecd'),
        ],
      },
      {
        id: 'firehose',
        indexNameList: ['logs-awsfirehose'],
        title: 'Uncategorized Firehose Logs',
        logoURL: 'https://epr.elastic.co/package/awsfirehose/1.1.0/img/logo_firehose.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [generateLogsExplorerActionLink('awsfirehose', 'Firehose')],
      },
    ],
    [
      generateLogsDashboardActionLink,
      generateLogsExplorerActionLink,
      generateMetricsDashboardActionLink,
      generateMetricsDiscoverActionLink,
    ]
  );
}
