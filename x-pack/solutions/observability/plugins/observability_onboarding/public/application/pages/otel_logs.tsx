/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ObservabilityOnboardingPricingFeature } from '../../../common/pricing_features';
import { PageTemplate } from './template';
import { CustomHeader } from '../header';
import { OtelLogsPanel } from '../quickstart_flows/otel_logs';
import { usePricingFeature } from '../quickstart_flows/shared/use_pricing_feature';
import { useManagedOtlpServiceTechPreviewVisibility } from '../shared/use_managed_otlp_service_tech_preview_visibility';

export const OtelLogsPage = () => {
  const metricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );
  const showTechPreviewBadge = useManagedOtlpServiceTechPreviewVisibility();

  return (
    <PageTemplate
      customHeader={
        <CustomHeader
          logo="opentelemetry"
          headlineCopy={i18n.translate(
            'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.otel.text',
            {
              defaultMessage: 'OpenTelemetry',
            }
          )}
          captionCopy={
            metricsOnboardingEnabled
              ? i18n.translate(
                  'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.otel.description',
                  {
                    defaultMessage:
                      'Collect logs and host metrics using the Elastic distribution of the OTel collector.',
                  }
                )
              : i18n.translate(
                  'xpack.observability_onboarding.logsEssential.experimentalOnboardingFlow.customHeader.otel.description',
                  {
                    defaultMessage:
                      'Collect logs using the Elastic distribution of the OTel collector.',
                  }
                )
          }
          isTechnicalPreview={showTechPreviewBadge}
        />
      }
    >
      <OtelLogsPanel />
    </PageTemplate>
  );
};
