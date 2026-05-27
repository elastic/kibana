/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CollectionMethodOption } from '../../shared/collection_method_selector';

export const KUBERNETES_SELECTOR_LEGEND = i18n.translate(
  'xpack.observability_onboarding.kubernetesV2.selectorLegend',
  { defaultMessage: 'Choose a collection method' }
);

export const KUBERNETES_SELECTOR_STEP_TITLE = i18n.translate(
  'xpack.observability_onboarding.kubernetesV2.selectorStepTitle',
  { defaultMessage: 'Choose how to collect Kubernetes telemetry' }
);

interface BuildKubernetesCollectionMethodOptionsArgs {
  otelNavigateTo: string;
  elasticAgentNavigateTo: string;
}

export const buildKubernetesCollectionMethodOptions = ({
  otelNavigateTo,
  elasticAgentNavigateTo,
}: BuildKubernetesCollectionMethodOptionsArgs): CollectionMethodOption[] => [
  {
    id: 'otel',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.collectionMethod.otel.label',
      {
        defaultMessage: 'OpenTelemetry',
      }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.collectionMethod.otel.description',
      {
        defaultMessage:
          'Use the Elastic Distribution of OpenTelemetry Collector for Kubernetes logs and metrics.',
      }
    ),
    logo: 'opentelemetry',
    recommended: true,
    navigateTo: otelNavigateTo,
  },
  {
    id: 'elastic-agent',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.collectionMethod.elasticAgent.label',
      {
        defaultMessage: 'Elastic Agent',
      }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.collectionMethod.elasticAgent.description',
      {
        defaultMessage: 'Deploy a standalone Elastic Agent on your Kubernetes cluster.',
      }
    ),
    euiIconType: 'agentApp',
    navigateTo: elasticAgentNavigateTo,
  },
];
