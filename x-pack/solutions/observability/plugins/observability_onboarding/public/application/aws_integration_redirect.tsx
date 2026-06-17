/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ONBOARDING_APP_ID } from '@kbn/deeplinks-observability';
import type { ObservabilityOnboardingAppServices } from '..';

const AWS_CLOUDWATCH_OTEL_PACKAGE = 'aws_cloudwatch_input_otel';
const BACK_LINK_PATH = '?category=cloud';

export const AwsIntegrationRedirect: React.FC = () => {
  const {
    services: { http, application },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useEffect(() => {
    let cancelled = false;

    const resolveAndRedirect = async () => {
      try {
        const response = await http.get<{ item: { version: string } }>(
          `/api/fleet/epm/packages/${AWS_CLOUDWATCH_OTEL_PACKAGE}`,
          { query: { prerelease: true } }
        );

        if (cancelled) return;

        const version = response.item?.version?.trim();
        if (!version) {
          application.navigateToApp('integrations', { replace: true });
          return;
        }

        const onCancelUrl = application.getUrlForApp(OBSERVABILITY_ONBOARDING_APP_ID, {
          path: BACK_LINK_PATH,
        });

        application.navigateToApp('fleet', {
          path: `/integrations/${AWS_CLOUDWATCH_OTEL_PACKAGE}-${version}/add-integration`,
          state: {
            onCancelNavigateTo: [OBSERVABILITY_ONBOARDING_APP_ID, { path: BACK_LINK_PATH }],
            onCancelUrl,
          },
          replace: true,
        });
      } catch {
        if (cancelled) return;
        application.navigateToApp('integrations', { replace: true });
      }
    };

    resolveAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [http, application]);

  return (
    <EuiEmptyPrompt
      data-test-subj="awsIntegrationRedirectLoading"
      icon={<EuiLoadingSpinner size="xl" />}
      title={
        <h2>
          {i18n.translate('xpack.observability_onboarding.awsIntegrationRedirect.loadingTitle', {
            defaultMessage: 'Opening the AWS integration',
          })}
        </h2>
      }
    />
  );
};
