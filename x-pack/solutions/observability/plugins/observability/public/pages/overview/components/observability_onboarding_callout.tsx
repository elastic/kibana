/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import React, { useCallback } from 'react';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { useObservabilityOnboarding } from '../../../hooks/use_observability_onboarding';

export function ObservabilityOnboardingCallout() {
  const { application, share } = useKibana<ObservabilityPublicPluginsStart>().services;
  const onboardingHref = share?.url.locators
    .get<ObservabilityOnboardingLocatorParams>('OBSERVABILITY_ONBOARDING_LOCATOR')
    ?.useUrl({ category: 'logs' });

  const trackMetric = useUiTracker({ app: 'observability-overview' });
  const { isObservabilityOnboardingDismissed, dismissObservabilityOnboarding } =
    useObservabilityOnboarding();

  const dismissOnboarding = useCallback(() => {
    dismissObservabilityOnboarding();
    trackMetric({ metric: 'observability_onboarding_dismiss' });
  }, [dismissObservabilityOnboarding, trackMetric]);

  const getStarted = () => {
    trackMetric({ metric: 'observability_onboarding_get_started' });
    application?.navigateToUrl(onboardingHref!);
  };

  return !isObservabilityOnboardingDismissed ? (
    <>
      <EuiPanel color="primary" data-test-subj="observability-onboarding-callout">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h2>
                <FormattedMessage
                  id="xpack.observability.overview.observabilityOnboarding"
                  defaultMessage="Collect and analyze logs in observability"
                />
              </h2>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.observability.overview.observabilityOnboarding.description"
                  defaultMessage="Onboard your data in up to 5 minutes to start analysing it straight away."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} direction="row" alignItems="center">
              <EuiFlexItem>
                <EuiButtonEmpty
                  data-test-subj="o11yObservabilityOnboardingDismissButton"
                  size="s"
                  onClick={dismissOnboarding}
                >
                  <FormattedMessage
                    id="xpack.observability.overview.observabilityOnboarding.dismiss"
                    defaultMessage="Dismiss"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  data-test-subj="o11yObservabilityOnboardingGetStartedButton"
                  size="s"
                  onClick={getStarted}
                >
                  <FormattedMessage
                    id="xpack.observability.overview.observabilityOnboarding.getStarted"
                    defaultMessage="Get started"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer />
    </>
  ) : null;
}
