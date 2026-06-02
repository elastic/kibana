/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { useKibana } from '../services';
import { StepRail } from './step_rail';
import type { VectorPath, WizardStep } from './types';

interface StepLayoutProps {
  currentStep: 1 | 2;
  path: VectorPath;
  step: WizardStep;
  title: string;
  description: React.ReactNode;
  docsLabel: string;
  docsHref: string;
  onBack?: () => void;
  onNext?: () => void;
  onComplete?: () => void;
  children: React.ReactNode;
}

export const StepLayout = ({
  currentStep,
  path,
  step,
  title,
  description,
  docsLabel,
  docsHref,
  onBack,
  onNext,
  onComplete,
  children,
}: StepLayoutProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { notifications },
  } = useKibana();

  const telemetryIdPrefix = `vectordbOnboarding-${path}-${step}`;

  return (
    <EuiPageTemplate restrictWidth panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiButtonEmpty
          iconType="sortLeft"
          flush="left"
          color="primary"
          onClick={onBack}
          data-test-subj="stepLayoutBackToOnboarding"
          data-telemetry-id={`${telemetryIdPrefix}-backBtn`}
        >
          <FormattedMessage
            id="vectordbOnboarding.stepLayout.backButtonLabel"
            defaultMessage="Back"
          />
        </EuiButtonEmpty>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="l" alignItems="flexStart">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h1>{title}</h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued" css={{ maxWidth: euiTheme.base * 36 }}>
              <p>{description}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiLink
              href={docsHref}
              external
              target="_blank"
              data-telemetry-id={`${telemetryIdPrefix}-docsLink`}
            >
              {docsLabel}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() =>
                openWiredConnectionDetails({
                  props: { options: { defaultTabId: 'apiKeys' } },
                }).catch((error) => {
                  notifications.toasts.addDanger(
                    error?.body?.message ??
                      error?.message ??
                      i18n.translate('vectordbOnboarding.stepLayout.unexpectedError', {
                        defaultMessage: 'An unexpected error occurred',
                      })
                  );
                })
              }
              iconType="plugs"
              color="text"
              data-test-subj="openConnectionDetails"
              data-telemetry-id={`${telemetryIdPrefix}-connectionDetailsBtn`}
            >
              <FormattedMessage
                id="vectordbOnboarding.stepLayout.connectionDetailsButtonLabel"
                defaultMessage="Connection details"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup gutterSize="l" alignItems="flexStart">
          <EuiFlexItem grow={true}>{children}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StepRail
              currentStep={currentStep}
              path={path}
              stepName={step}
              onNext={onNext}
              onComplete={onComplete}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
