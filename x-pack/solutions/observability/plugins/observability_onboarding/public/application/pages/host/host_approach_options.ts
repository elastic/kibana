/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApproachOption } from '../../shared/approach_selector';

export const HOST_APPROACH_SELECTOR_LEGEND = i18n.translate(
  'xpack.observability_onboarding.hostV2.approachSelectorLegend',
  { defaultMessage: 'Choose an approach' }
);

export const HOST_APPROACH_STEP_TITLE = i18n.translate(
  'xpack.observability_onboarding.hostV2.approachStepTitle',
  { defaultMessage: 'Choose how to collect host telemetry' }
);

interface BuildHostApproachOptionsArgs {
  otel: { navigateTo: string };
  elasticAgent: { navigateTo: string };
}

export const buildHostApproachOptions = ({
  otel,
  elasticAgent,
}: BuildHostApproachOptionsArgs): ApproachOption[] => [
  {
    id: 'otel',
    label: i18n.translate('xpack.observability_onboarding.hostV2.approach.otel.label', {
      defaultMessage: 'OpenTelemetry',
    }),
    description: i18n.translate('xpack.observability_onboarding.hostV2.approach.otel.description', {
      defaultMessage:
        'Use the Elastic Distribution of OpenTelemetry Collector for logs and metrics.',
    }),
    logo: 'opentelemetry',
    recommended: true,
    navigateTo: otel.navigateTo,
  },
  {
    id: 'auto-detect',
    label: i18n.translate('xpack.observability_onboarding.hostV2.approach.ea.label', {
      defaultMessage: 'Elastic Agent',
    }),
    description: i18n.translate('xpack.observability_onboarding.hostV2.approach.ea.description', {
      defaultMessage: 'Deploy a standalone Elastic Agent that auto-detects services on the host.',
    }),
    euiIconType: 'agentApp',
    navigateTo: elasticAgent.navigateTo,
  },
];
