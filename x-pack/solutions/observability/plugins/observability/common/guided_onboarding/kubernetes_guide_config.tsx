/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GuideConfig } from '@kbn/guided-onboarding';
import { i18n } from '@kbn/i18n';

export const kubernetesGuideId = 'kubernetes';
export const kubernetesGuideConfig: GuideConfig = {
  title: i18n.translate('xpack.observability.guideConfig.title', {
    defaultMessage: 'Monitor my Kubernetes clusters',
  }),
  description: i18n.translate('xpack.observability.guideConfig.description', {
    defaultMessage: `We'll help you connect Elastic and Kubernetes to start collecting and analyzing logs and metrics.`,
  }),
  guideName: 'Kubernetes',
  telemetryId: 'kubernetes',
  docs: {
    text: i18n.translate('xpack.observability.guideConfig.documentationLink', {
      defaultMessage: 'Learn more',
    }),
    url: 'https://docs.elastic.co/en/integrations/kubernetes',
  },
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('xpack.observability.guideConfig.addDataStep.title', {
        defaultMessage: 'Add data',
      }),
      integration: 'kubernetes',
      description: {
        descriptionText: i18n.translate(
          'xpack.observability.guideConfig.addDataStep.description.descriptionText',
          {
            defaultMessage:
              'To get your Kubernetes data flowing, install Elastic Agent in the Kubernetes cluster you want to monitor. Once Elastic Agent is deployed, you can optionally add kube-state-metrics for a more comprehensive metrics coverage.',
          }
        ),
        linkText: i18n.translate(
          'xpack.observability.guideConfig.addDataStep.descriptionList.item1.linkText',
          {
            defaultMessage: 'Learn more',
          }
        ),
        linkUrl: 'https://github.com/kubernetes/kube-state-metrics',
        isLinkExternal: true,
      },
      location: {
        appID: 'integrations',
        path: '/detail/kubernetes/overview',
      },
    },
    {
      id: 'view_dashboard',
      title: i18n.translate('xpack.observability.guideConfig.viewDashboardStep.title', {
        defaultMessage: 'Explore Kubernetes metrics and logs',
      }),
      description: i18n.translate('xpack.observability.guideConfig.viewDashboardStep.description', {
        defaultMessage: 'Visualize and analyze your Kubernetes environment.',
      }),
      location: {
        appID: 'dashboards',
        path: '#/view/kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
      },
      manualCompletion: {
        title: i18n.translate(
          'xpack.observability.guideConfig.viewDashboardStep.manualCompletionPopoverTitle',
          {
            defaultMessage: 'Explore Kubernetes dashboards',
          }
        ),
        description: i18n.translate(
          'xpack.observability.guideConfig.viewDashboardStep.manualCompletionPopoverDescription',
          {
            defaultMessage: `Take your time to explore these pre-built dashboards included with the Kubernetes integration. When you're ready, click the Setup guide button to continue.`,
          }
        ),
        readyToCompleteOnNavigation: true,
      },
    },
    {
      id: 'tour_observability',
      title: i18n.translate('xpack.observability.guideConfig.tourObservabilityStep.title', {
        defaultMessage: 'Tour Elastic Observability',
      }),
      description: i18n.translate(
        'xpack.observability.guideConfig.tourObservabilityStep.description',
        {
          defaultMessage: 'Get familiar with the rest of Elastic Observability.',
        }
      ),
      location: {
        appID: 'observability',
        path: '/overview',
      },
    },
  ],
};
