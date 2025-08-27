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
import { CustomHeader } from '../header/custom_header';
import { AutoDetectPanel } from '../quickstart_flows/auto_detect';
import { usePricingFeature } from '../quickstart_flows/shared/use_pricing_feature';

export const AutoDetectPage = () => {
  const metricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );

  return (
    <PageTemplate
      customHeader={
        <CustomHeader
          euiIconType="consoleApp"
          headlineCopy={
            metricsOnboardingEnabled
              ? i18n.translate(
                  'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.system.text',
                  {
                    defaultMessage: 'Auto-detect logs and metrics',
                  }
                )
              : i18n.translate(
                  'xpack.observability_onboarding.logsEssential.experimentalOnboardingFlow.customHeader.system.text',
                  {
                    defaultMessage: 'Auto-detect logs',
                  }
                )
          }
          captionCopy={
            metricsOnboardingEnabled
              ? i18n.translate(
                  'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.system.description',
                  {
                    defaultMessage:
                      'This installation scans your host and auto-detects log and metric files.',
                  }
                )
              : i18n.translate(
                  'xpack.observability_onboarding.logsEssential.experimentalOnboardingFlow.customHeader.system.description',
                  {
                    defaultMessage: 'This installation scans your host and auto-detects log files.',
                  }
                )
          }
        />
      }
    >
      <AutoDetectPanel />
    </PageTemplate>
  );
};
