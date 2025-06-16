/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PageTemplate } from './template';
import { CustomHeader } from '../header/custom_header';
import { AutoDetectPanel } from '../quickstart_flows/auto_detect';
import { ObservabilityOnboardingAppServices } from '../..';

export const AutoDetectPage = () => {
  const {
    services: { pricing },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const logsOnboardingEnabled =
    pricing?.isFeatureAvailable('observability-logs-onboarding') ?? true;

  return (
    <PageTemplate
      customHeader={
        <CustomHeader
          euiIconType="consoleApp"
          headlineCopy={
            logsOnboardingEnabled
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
            logsOnboardingEnabled
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
