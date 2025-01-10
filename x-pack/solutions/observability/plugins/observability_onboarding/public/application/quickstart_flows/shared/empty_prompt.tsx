/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, type FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  OBSERVABILITY_ONBOARDING_FLOW_ERROR_TELEMETRY_EVENT,
  OnboardingFlowEventContext,
} from '../../../../common/telemetry_events';
import { ObservabilityOnboardingAppServices } from '../../..';

interface EmptyPromptProps {
  onboardingFlowType: string;
  error: IHttpFetchError<ResponseErrorBody>;
  telemetryEventContext?: OnboardingFlowEventContext;
  onRetryClick(): void;
}
export const EmptyPrompt: FunctionComponent<EmptyPromptProps> = ({
  onboardingFlowType,
  error,
  telemetryEventContext,
  onRetryClick,
}) => {
  const {
    services: { analytics },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useEffect(() => {
    analytics?.reportEvent(OBSERVABILITY_ONBOARDING_FLOW_ERROR_TELEMETRY_EVENT.eventType, {
      onboardingFlowType,
      error: error.body?.message ?? error.message,
      context: telemetryEventContext,
    });
  }, [analytics, error, onboardingFlowType, telemetryEventContext]);

  if (error.response?.status === 403) {
    return (
      <EuiEmptyPrompt
        color="plain"
        iconType="lock"
        title={
          <h2>
            {i18n.translate(
              'xpack.observability_onboarding.autoDetectPanel.h2.contactYourAdministratorForLabel',
              { defaultMessage: 'Contact your administrator for access' }
            )}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.observability_onboarding.autoDetectPanel.p.toInstallIntegrationsAndLabel',
              {
                defaultMessage:
                  'To install integrations and ingest data, you need additional privileges.',
              }
            )}
          </p>
        }
      />
    );
  }

  return (
    <EuiEmptyPrompt
      color="danger"
      iconType="error"
      title={
        <h2>
          {i18n.translate(
            'xpack.observability_onboarding.autoDetectPanel.h2.unableToInitiateDataLabel',
            { defaultMessage: 'Unable to load content' }
          )}
        </h2>
      }
      body={
        <p>
          {i18n.translate(
            'xpack.observability_onboarding.autoDetectPanel.p.thereWasAProblemLabel',
            {
              defaultMessage:
                'There was a problem loading the application. Retry or contact your administrator for help.',
            }
          )}
        </p>
      }
      actions={
        <EuiButton
          color="danger"
          iconType="refresh"
          fill
          data-test-subj="observabilityOnboardingAutoDetectPanelGoBackButton"
          onClick={onRetryClick}
        >
          {i18n.translate(
            'xpack.observability_onboarding.autoDetectPanel.backToSelectionButtonLabel',
            { defaultMessage: 'Retry' }
          )}
        </EuiButton>
      }
    />
  );
};
