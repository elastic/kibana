/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { useHistory } from 'react-router-dom';
import { useLocation } from 'react-router-dom-v5-compat';
import { ObservabilityOnboardingAppServices } from '../..';
import { LogoIcon } from '../shared/logo_icon';

export function useCustomCards(
  createCollectionCardHandler: (query: string) => () => void
): IntegrationCardItem[] {
  const history = useHistory();
  const location = useLocation();
  const {
    services: {
      application,
      http,
      context: { isServerless, isCloud },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const getUrlForApp = application?.getUrlForApp;

  const { href: autoDetectUrl } = reactRouterNavigate(history, `/auto-detect/${location.search}`);
  const { href: otelLogsUrl } = reactRouterNavigate(history, `/otel-logs/${location.search}`);
  const { href: kubernetesUrl } = reactRouterNavigate(history, `/kubernetes/${location.search}`);
  const { href: otelKubernetesUrl } = reactRouterNavigate(
    history,
    `/otel-kubernetes/${location.search}`
  );
  const { href: customLogsUrl } = reactRouterNavigate(history, `/customLogs/${location.search}`);
  const { href: firehoseUrl } = reactRouterNavigate(history, `/firehose/${location.search}`);

  const apmUrl = `${getUrlForApp?.('apm')}/${isServerless ? 'onboarding' : 'tutorial'}`;
  const otelApmUrl = isServerless ? `${apmUrl}?agent=openTelemetry` : apmUrl;

  const firehoseQuickstartCard: IntegrationCardItem = {
    id: 'firehose-quick-start',
    name: 'firehose-quick-start',
    type: 'virtual',
    title: i18n.translate('xpack.observability_onboarding.packageList.uploadFileTitle', {
      defaultMessage: 'AWS Firehose',
    }),
    description: i18n.translate(
      'xpack.observability_onboarding.packageList.uploadFileDescription',
      {
        defaultMessage: 'Collect logs and metrics from Amazon Web Services (AWS).',
      }
    ),
    categories: ['observability'],
    icons: [
      {
        type: 'svg',
        src: 'https://epr.elastic.co/package/awsfirehose/1.1.0/img/logo_firehose.svg',
      },
    ],
    url: firehoseUrl,
    version: '',
    integration: '',
    isQuickstart: true,
  };

  return [
    {
      id: 'auto-detect-logs',
      name: 'auto-detect-logs-virtual',
      type: 'virtual',
      title: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.autoDetectTitle',
        {
          defaultMessage: 'Elastic Agent: Logs & Metrics',
        }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.autoDetectDescription',
        {
          defaultMessage: 'Scan your host for log files, metrics, auto-install integrations',
        }
      ),
      extraLabelsBadges: [
        <ExtraLabelBadgeWrapper>
          <LogoIcon logo="apple" size="m" />
        </ExtraLabelBadgeWrapper>,
        <ExtraLabelBadgeWrapper>
          <LogoIcon logo="linux" size="m" />
        </ExtraLabelBadgeWrapper>,
      ],
      categories: ['observability'],
      icons: [
        {
          type: 'eui',
          src: 'agentApp',
        },
      ],
      url: autoDetectUrl,
      version: '',
      integration: '',
      isQuickstart: true,
    },
    {
      id: 'otel-logs',
      name: 'custom-logs-virtual',
      type: 'virtual',
      title: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.logsOtelTitle',
        {
          defaultMessage: 'OpenTelemetry: Logs & Metrics',
        }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.logsOtelDescription',
        {
          defaultMessage:
            'Collect logs and host metrics with the Elastic Distro for OTel Collector',
        }
      ),
      extraLabelsBadges: [
        <ExtraLabelBadgeWrapper>
          <LogoIcon logo="apple" size="m" />
        </ExtraLabelBadgeWrapper>,
        <ExtraLabelBadgeWrapper>
          <LogoIcon logo="linux" size="m" />
        </ExtraLabelBadgeWrapper>,
      ],
      categories: ['observability'],
      icons: [
        {
          type: 'svg',
          src: http?.staticAssets.getPluginAssetHref('opentelemetry.svg') ?? '',
        },
      ],
      url: otelLogsUrl,
      version: '',
      integration: '',
      isQuickstart: true,
      release: isServerless ? 'preview' : undefined,
    },
    {
      id: 'kubernetes-quick-start',
      name: 'kubernetes-quick-start',
      type: 'virtual',
      title: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.kubernetesTitle',
        {
          defaultMessage: 'Elastic Agent: Logs & Metrics',
        }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.kubernetesDescription',
        {
          defaultMessage: 'Collect logs and metrics from Kubernetes using Elastic Agent',
        }
      ),
      extraLabelsBadges: [
        <ExtraLabelBadgeWrapper>
          <LogoIcon logo="kubernetes" size="m" />
        </ExtraLabelBadgeWrapper>,
      ],
      categories: ['observability'],
      icons: [
        {
          type: 'eui',
          src: 'agentApp',
        },
      ],
      url: kubernetesUrl,
      version: '',
      integration: '',
      isQuickstart: true,
    },
    {
      id: 'otel-kubernetes',
      name: 'otel-kubernetes-virtual',
      type: 'virtual',
      title: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.kubernetesOtelTitle',
        {
          defaultMessage: 'OpenTelemetry: Full Observability',
        }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.kubernetesOtelDescription',
        {
          defaultMessage:
            'Collect logs, traces and metrics with the Elastic Distro for OTel Collector',
        }
      ),
      extraLabelsBadges: [
        <ExtraLabelBadgeWrapper>
          <LogoIcon logo="kubernetes" size="m" />
        </ExtraLabelBadgeWrapper>,
      ],
      categories: ['observability'],
      icons: [
        {
          type: 'svg',
          src: http?.staticAssets.getPluginAssetHref('opentelemetry.svg') ?? '',
        },
      ],
      url: otelKubernetesUrl,
      version: '',
      integration: '',
      isQuickstart: true,
      release: isServerless ? 'preview' : undefined,
    },
    {
      id: 'apm-virtual',
      type: 'virtual',
      title: i18n.translate('xpack.observability_onboarding.useCustomCardsForCategory.apmTitle', {
        defaultMessage: 'Elastic APM',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.apmDescription',
        {
          defaultMessage: 'Collect distributed traces from your applications with Elastic APM',
        }
      ),
      name: 'apm',
      categories: ['observability'],
      icons: [
        {
          type: 'eui',
          src: 'apmApp',
        },
      ],
      url: apmUrl,
      version: '',
      integration: '',
    },
    {
      id: 'otel-virtual',
      type: 'virtual',
      title: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.apmOtelTitle',
        {
          defaultMessage: 'OpenTelemetry',
        }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.apmOtelDescription',
        {
          defaultMessage: 'Collect distributed traces with OpenTelemetry',
        }
      ),
      name: 'otel',
      categories: ['observability'],
      icons: [
        {
          type: 'svg',
          src: http?.staticAssets.getPluginAssetHref('opentelemetry.svg') ?? '',
        },
      ],
      url: otelApmUrl,
      version: '',
      integration: '',
    },
    {
      id: 'synthetics-virtual',
      type: 'virtual',
      title: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.syntheticsTitle',
        {
          defaultMessage: 'Synthetic monitor',
        }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.syntheticsDescription',
        {
          defaultMessage: 'Monitor endpoints, pages, and user journeys',
        }
      ),
      name: 'synthetics',
      categories: ['observability'],
      icons: [
        {
          type: 'eui',
          src: 'logoUptime',
        },
      ],
      url: getUrlForApp?.('synthetics') ?? '',
      version: '',
      integration: '',
    },
    {
      id: 'azure-logs-virtual',
      type: 'virtual',
      title: i18n.translate('xpack.observability_onboarding.useCustomCardsForCategory.azureTitle', {
        defaultMessage: 'Azure',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.azureDescription',
        {
          defaultMessage: 'Collect logs from Microsoft Azure',
        }
      ),
      name: 'azure',
      categories: ['observability'],
      icons: [],
      url: 'https://azure.com',
      version: '',
      integration: '',
      isCollectionCard: true,
      onCardClick: createCollectionCardHandler('azure'),
    },
    {
      id: 'aws-logs-virtual',
      type: 'virtual',
      title: i18n.translate('xpack.observability_onboarding.useCustomCardsForCategory.awsTitle', {
        defaultMessage: 'AWS',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.awsDescription',
        {
          defaultMessage: 'Collect logs from Amazon Web Services (AWS)',
        }
      ),
      name: 'aws',
      categories: ['observability'],
      icons: [],
      url: 'https://aws.com',
      version: '',
      integration: '',
      isCollectionCard: true,
      onCardClick: createCollectionCardHandler('aws'),
    },
    {
      id: 'gcp-logs-virtual',
      type: 'virtual',
      title: i18n.translate('xpack.observability_onboarding.useCustomCardsForCategory.gcpTitle', {
        defaultMessage: 'Google Cloud Platform',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.useCustomCardsForCategory.gcpDescription',
        {
          defaultMessage: 'Collect logs from Google Cloud Platform',
        }
      ),
      name: 'gcp',
      categories: ['observability'],
      icons: [],
      url: '',
      version: '',
      integration: '',
      isCollectionCard: true,
      onCardClick: createCollectionCardHandler('gcp'),
    },
    {
      id: 'upload-file-virtual',
      type: 'virtual',
      title: i18n.translate('xpack.observability_onboarding.packageList.uploadFileTitle', {
        defaultMessage: 'Upload a file',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.packageList.uploadFileDescription',
        {
          defaultMessage:
            'Upload data from a CSV, TSV, JSON or other log file to Elasticsearch for analysis.',
        }
      ),
      name: 'upload-file',
      categories: ['observability'],
      icons: [
        {
          type: 'eui',
          src: 'addDataApp',
        },
      ],
      url: `${getUrlForApp?.('home')}#/tutorial_directory/fileDataViz`,
      version: '',
      integration: '',
      isCollectionCard: false,
    },
    {
      id: 'custom-logs',
      type: 'virtual',
      title: 'Stream log files',
      description: 'Stream any logs into Elastic in a simple way and explore their data',
      name: 'custom-logs-virtual',
      categories: ['observability'],
      icons: [
        {
          type: 'eui',
          src: 'filebeatApp',
        },
      ],
      url: customLogsUrl,
      version: '',
      integration: '',
    },
    /**
     * The new Firehose card should only be visible on Cloud
     * as Firehose integration requires additional proxy,
     * which is not available for on-prem customers.
     */
    ...(isCloud ? [firehoseQuickstartCard] : []),
  ];
}

function ExtraLabelBadgeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <EuiFlexItem grow={false} css={{ alignSelf: 'center' }}>
      {children}
    </EuiFlexItem>
  );
}
