/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CollectionMethodOption } from '../../shared/collection_method_selector';

export const HOST_SELECTOR_LEGEND = i18n.translate(
  'xpack.observability_onboarding.host.selectorLegend',
  { defaultMessage: 'Choose a collection method' }
);

export const HOST_SELECTOR_STEP_TITLE = i18n.translate(
  'xpack.observability_onboarding.host.selectorStepTitle',
  { defaultMessage: 'Choose how to collect host telemetry' }
);

interface BuildHostCollectionMethodOptionsArgs {
  otelNavigateTo: string;
  eaNavigateTo: string;
}

export const buildHostCollectionMethodOptions = ({
  otelNavigateTo,
  eaNavigateTo,
}: BuildHostCollectionMethodOptionsArgs): CollectionMethodOption[] => [
  {
    id: 'otel',
    label: i18n.translate('xpack.observability_onboarding.host.collectionMethod.otel.label', {
      defaultMessage: 'OpenTelemetry',
    }),
    description: i18n.translate(
      'xpack.observability_onboarding.host.collectionMethod.otel.description',
      {
        defaultMessage:
          'Use the Elastic Distribution of OpenTelemetry Collector for logs and metrics.',
      }
    ),
    logo: 'opentelemetry',
    recommended: true,
    navigateTo: otelNavigateTo,
  },
  {
    id: 'auto-detect',
    label: i18n.translate('xpack.observability_onboarding.host.collectionMethod.ea.label', {
      defaultMessage: 'Elastic Agent',
    }),
    description: i18n.translate(
      'xpack.observability_onboarding.host.collectionMethod.ea.description',
      {
        defaultMessage: 'Deploy a standalone Elastic Agent that auto-detects services on the host.',
      }
    ),
    euiIconType: 'agentApp',
    navigateTo: eaNavigateTo,
  },
];
