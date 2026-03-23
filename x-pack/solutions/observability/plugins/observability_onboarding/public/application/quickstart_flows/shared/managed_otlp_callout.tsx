/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useManagedOtlpServiceTechPreviewVisibility } from '../../shared/use_managed_otlp_service_tech_preview_visibility';

export function ManagedOtlpCallout() {
  const isTechnicalPreview = useManagedOtlpServiceTechPreviewVisibility();

  if (!isTechnicalPreview) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        title={managedOtlpCalloutTitleText}
        iconType="info"
        color="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.managedOtlpCallout.description"
            defaultMessage="Managed OTLP Endpoint should not be used in production yet for Elastic Cloud Hosted deployments. For more details, refer to the {motlpDocumentation}."
            values={{
              motlpDocumentation: (
                <EuiLink
                  data-test-subj="observabilityOnboardingManagedOtlpCalloutDocsLink"
                  target="_blank"
                  href="https://www.elastic.co/docs/reference/opentelemetry/motlp"
                >
                  {managedOtlpDocumentationLinkLabelText}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
}

const managedOtlpCalloutTitleText = i18n.translate(
  'xpack.observability_onboarding.managedOtlpCallout.title',
  {
    defaultMessage: 'Managed OTLP Endpoint is in Tech Preview for Elastic Cloud Hosted',
  }
);

const managedOtlpDocumentationLinkLabelText = i18n.translate(
  'xpack.observability_onboarding.managedOtlpCallout.documentationLinkLabel',
  {
    defaultMessage: 'Managed OTLP Endpoint documentation',
  }
);
