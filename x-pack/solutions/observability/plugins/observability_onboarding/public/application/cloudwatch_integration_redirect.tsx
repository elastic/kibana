/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ONBOARDING_APP_ID } from '@kbn/deeplinks-observability';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import type { CreatePackagePolicyRouteState } from '@kbn/fleet-plugin/public';
import type { ObservabilityOnboardingAppServices } from '..';

const AWS_CLOUDWATCH_OTEL_PACKAGE = 'aws_cloudwatch_input_otel';
const BACK_LINK_PATH = '?category=cloud';
// Abort version resolution if Fleet's EPM endpoint hangs, so the user is never stuck on the spinner.
const RESOLVE_TIMEOUT_MS = 30_000;

export const CloudwatchIntegrationRedirect: React.FC = () => {
  const {
    services: { http, application },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const [hasError, setHasError] = useState(false);
  // Bumping this re-runs the resolve effect when the user clicks "Try again".
  const [attempt, setAttempt] = useState(0);

  const goBackToCloud = useCallback(() => {
    application.navigateToApp(OBSERVABILITY_ONBOARDING_APP_ID, {
      path: BACK_LINK_PATH,
      replace: true,
    });
  }, [application]);

  const retry = useCallback(() => {
    setHasError(false);
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);

    const resolveAndRedirect = async () => {
      try {
        // The package is beta-only, so prerelease must be enabled to resolve its version.
        // EPM_API_ROUTES.INFO_PATTERN requires a pinned version, which is what we are
        // resolving here, so the version-less package info path is used directly.
        const response = await http.get<{ item: { version: string } }>(
          `/api/fleet/epm/packages/${AWS_CLOUDWATCH_OTEL_PACKAGE}`,
          { query: { prerelease: true }, signal: controller.signal }
        );

        if (cancelled) return;

        const version = response.item?.version?.trim();
        if (!version) {
          setHasError(true);
          return;
        }

        const onCancelUrl = application.getUrlForApp(OBSERVABILITY_ONBOARDING_APP_ID, {
          path: BACK_LINK_PATH,
        });

        // Use Fleet's typed route state and path builder so a Fleet rename surfaces here at build time.
        const routeState: CreatePackagePolicyRouteState = {
          onCancelNavigateTo: [OBSERVABILITY_ONBOARDING_APP_ID, { path: BACK_LINK_PATH }],
          onCancelUrl,
        };
        const [, addIntegrationPath] = pagePathGetters.add_integration_to_policy({
          pkgkey: `${AWS_CLOUDWATCH_OTEL_PACKAGE}-${version}`,
        });

        // `replace: true` keeps this redirect out of history so the browser back button
        // returns to the Add data grid instead of re-firing the redirect.
        application.navigateToApp('fleet', {
          path: addIntegrationPath,
          state: routeState,
          replace: true,
        });
      } catch {
        if (cancelled) return;
        setHasError(true);
      } finally {
        clearTimeout(timeout);
      }
    };

    resolveAndRedirect();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [http, application, attempt]);

  if (hasError) {
    return (
      <EuiEmptyPrompt
        data-test-subj="cloudwatchIntegrationRedirectError"
        color="danger"
        iconType="error"
        title={
          <h2>
            {i18n.translate(
              'xpack.observability_onboarding.cloudwatchIntegrationRedirect.errorTitle',
              { defaultMessage: 'Unable to open Amazon CloudWatch' }
            )}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.observability_onboarding.cloudwatchIntegrationRedirect.errorBody',
              {
                defaultMessage:
                  'We could not open the Amazon CloudWatch integration. Try again, or go back to the Cloud category.',
              }
            )}
          </p>
        }
        actions={[
          <EuiButton
            key="retry"
            fill
            data-test-subj="cloudwatchIntegrationRedirectRetry"
            onClick={retry}
          >
            {i18n.translate(
              'xpack.observability_onboarding.cloudwatchIntegrationRedirect.retryButton',
              { defaultMessage: 'Try again' }
            )}
          </EuiButton>,
          <EuiButtonEmpty
            key="back"
            data-test-subj="cloudwatchIntegrationRedirectBack"
            onClick={goBackToCloud}
          >
            {i18n.translate(
              'xpack.observability_onboarding.cloudwatchIntegrationRedirect.backButton',
              { defaultMessage: 'Back to Cloud' }
            )}
          </EuiButtonEmpty>,
        ]}
      />
    );
  }

  return (
    <EuiEmptyPrompt
      data-test-subj="cloudwatchIntegrationRedirectLoading"
      icon={<EuiLoadingSpinner size="xl" />}
      title={
        <h2>
          {i18n.translate(
            'xpack.observability_onboarding.cloudwatchIntegrationRedirect.loadingTitle',
            { defaultMessage: 'Opening Amazon CloudWatch' }
          )}
        </h2>
      }
    />
  );
};
