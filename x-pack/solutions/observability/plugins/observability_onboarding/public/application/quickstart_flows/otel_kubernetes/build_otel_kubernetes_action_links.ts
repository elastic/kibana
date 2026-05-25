/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ActionLink } from '../kubernetes/data_ingest_status';
import { CLUSTER_OVERVIEW_DASHBOARD_ID } from './constants';

export interface BuildOtelKubernetesActionLinksParams {
  isMetricsOnboardingEnabled: boolean;
  dashboardHref: string;
  servicesHref: string;
  logsHref: string;
}

/**
 * Build the action links shown by the OTel Kubernetes onboarding panel.
 *
 * The `requires` field on each link drives the `DataIngestStatus` polling
 * gate: polling continues until every declared data type has arrived. The
 * logs link must declare `requires: 'logs'` so the gate does not latch on
 * a metrics-first poll while logs are still pending, mirroring the EA
 * Kubernetes flow.
 */
export const buildOtelKubernetesActionLinks = ({
  isMetricsOnboardingEnabled,
  dashboardHref,
  servicesHref,
  logsHref,
}: BuildOtelKubernetesActionLinksParams): ActionLink[] => [
  ...(isMetricsOnboardingEnabled
    ? [
        {
          id: CLUSTER_OVERVIEW_DASHBOARD_ID,
          title: i18n.translate(
            'xpack.observability_onboarding.otelKubernetesPanel.monitoringCluster',
            { defaultMessage: 'Check your Kubernetes cluster health:' }
          ),
          label: i18n.translate(
            'xpack.observability_onboarding.otelKubernetesPanel.exploreDashboard',
            { defaultMessage: 'Explore Kubernetes Cluster Dashboard' }
          ),
          requires: 'metrics' as const,
          href: dashboardHref,
        },
        {
          id: 'services',
          title: i18n.translate(
            'xpack.observability_onboarding.otelKubernetesPanel.servicesTitle',
            { defaultMessage: 'Check your application services:' }
          ),
          label: i18n.translate(
            'xpack.observability_onboarding.otelKubernetesPanel.servicesLabel',
            { defaultMessage: 'Explore Service inventory' }
          ),
          requires: 'metrics' as const,
          href: servicesHref,
        },
      ]
    : []),
  {
    id: 'logs',
    title: i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.logsTitle', {
      defaultMessage: 'View and analyze your logs:',
    }),
    label: i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.logsLabel', {
      defaultMessage: 'Explore logs',
    }),
    requires: 'logs' as const,
    href: logsHref,
  },
];
