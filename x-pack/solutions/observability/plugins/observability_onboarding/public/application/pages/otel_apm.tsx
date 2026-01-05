/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { PageTemplate } from './template';
import { CustomHeader } from '../header';
import { OtelApmQuickstartFlow } from '../quickstart_flows/otel_apm';
import { useManagedOtlpServiceTechPreviewVisibility } from '../shared/use_managed_otlp_service_tech_preview_visibility';

export const OtelApmPage = () => {
  const showTechPreviewBadge = useManagedOtlpServiceTechPreviewVisibility();

  return (
    <PageTemplate
      customHeader={
        <CustomHeader
          logo="opentelemetry"
          headlineCopy={i18n.translate(
            'xpack.observability_onboarding.onboarding.otelApmQuickstartFlow.customHeader.otel.text',
            {
              defaultMessage: 'Monitor your application using OpenTelemetry SDK',
            }
          )}
          captionCopy={i18n.translate(
            'xpack.observability_onboarding.onboarding.otelApmQuickstartFlow.customHeader.otel.description',
            {
              defaultMessage:
                'Instrument your applications to send traces, logs, and metrics directly to Elastic’s managed OTLP endpoint.',
            }
          )}
          isTechnicalPreview={showTechPreviewBadge}
        />
      }
    >
      <OtelApmQuickstartFlow />
    </PageTemplate>
  );
};
