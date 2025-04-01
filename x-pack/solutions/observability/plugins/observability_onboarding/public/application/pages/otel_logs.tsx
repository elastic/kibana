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
import { CustomHeader } from '../header';
import { OtelLogsPanel } from '../quickstart_flows/otel_logs';
import { type ObservabilityOnboardingAppServices } from '../..';

export const OtelLogsPage = () => {
  const {
    services: {
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

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
          captionCopy={i18n.translate(
            'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.otel.description',
            {
              defaultMessage:
                'Collect logs and host metrics using the Elastic distribution of the OTel collector.',
            }
          )}
          isTechnicalPreview={isServerless}
        />
      }
    >
      <OtelLogsPanel />
    </PageTemplate>
  );
};
