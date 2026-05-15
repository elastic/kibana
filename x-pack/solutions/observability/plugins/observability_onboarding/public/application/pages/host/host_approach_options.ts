/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SupportedLogo } from '../../shared/logo_icon';
import type { ApproachOption } from '../../shared/approach_selector';

const ELASTIC_AGENT_LOGO_BY_OS = {
  linux: 'linux',
  mac: 'apple_black',
} as const satisfies Record<'linux' | 'mac', SupportedLogo>;

export const HOST_APPROACH_SELECTOR_LEGEND = i18n.translate(
  'xpack.observability_onboarding.hostV2.approachSelectorLegend',
  { defaultMessage: 'Choose an approach' }
);

export const HOST_APPROACH_STEP_TITLE = i18n.translate(
  'xpack.observability_onboarding.hostV2.approachStepTitle',
  { defaultMessage: 'Choose how to collect host telemetry' }
);

export interface HostApproachLink {
  href: string;
  onClick?: ApproachOption['onClick'];
}

interface BuildHostApproachOptionsArgs {
  os: keyof typeof ELASTIC_AGENT_LOGO_BY_OS;
  otel: HostApproachLink;
  elasticAgent: HostApproachLink;
}

export const buildHostApproachOptions = ({
  os,
  otel,
  elasticAgent,
}: BuildHostApproachOptionsArgs): ApproachOption[] => [
  {
    // id matches the URL route segment for the Elastic Agent variant ('auto-detect');
    // 'otel' is the default approach for /host/<os>.
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
    href: otel.href,
    onClick: otel.onClick,
  },
  {
    id: 'auto-detect',
    label: i18n.translate('xpack.observability_onboarding.hostV2.approach.ea.label', {
      defaultMessage: 'Elastic Agent',
    }),
    description: i18n.translate('xpack.observability_onboarding.hostV2.approach.ea.description', {
      defaultMessage: 'Deploy a standalone Elastic Agent that auto-detects services on the host.',
    }),
    logo: ELASTIC_AGENT_LOGO_BY_OS[os],
    href: elasticAgent.href,
    onClick: elasticAgent.onClick,
  },
];
