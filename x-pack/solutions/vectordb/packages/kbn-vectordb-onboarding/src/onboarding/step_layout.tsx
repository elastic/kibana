/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiStepNumber,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../services';
import { useOnboardingCredentials } from './use_onboarding_credentials';

export const TOTAL_STEPS = 3;

interface StepLayoutProps {
  currentStep: 1 | 2 | 3;
  title?: string;
  description?: string;
  docsLabel?: string;
  docsHref?: string;
  variant?: 'panel' | 'hero';
  onSkip: () => void;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
}

const STEP_LABELS = [
  i18n.translate('vectordbOnboarding.wizard.steps.path', {
    defaultMessage: 'Start',
  }),
  i18n.translate('vectordbOnboarding.wizard.steps.ingest', { defaultMessage: 'Ingest' }),
  i18n.translate('vectordbOnboarding.wizard.steps.search', { defaultMessage: 'Search' }),
];

const CredentialField: React.FC<{
  label: string;
  value: string | null;
  isLoading: boolean;
  copyAriaLabel: string;
  fallback?: React.ReactNode;
}> = ({ label, value, isLoading, copyAriaLabel, fallback }) => (
  <>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiSpacer size="xs" />
    {isLoading ? (
      <EuiLoadingSpinner size="s" />
    ) : !value && fallback ? (
      fallback
    ) : (
      <EuiFieldText
        compressed
        readOnly
        value={value ?? '—'}
        append={
          value ? (
            <EuiCopy textToCopy={value}>
              {(copy) => (
                <EuiButtonIcon
                  iconType="copyClipboard"
                  onClick={copy}
                  aria-label={copyAriaLabel}
                  color="text"
                />
              )}
            </EuiCopy>
          ) : undefined
        }
      />
    )}
  </>
);

const StepRail: React.FC<{
  currentStep: 1 | 2 | 3;
  onSkip: () => void;
  docsLabel?: string;
  docsHref?: string;
}> = ({ currentStep, onSkip, docsLabel, docsHref }) => {
  const { elasticsearchUrl, apiKey, isLoading } = useOnboardingCredentials();
  const {
    services: { application },
  } = useKibana();

  const goToApiKeys = () =>
    application.navigateToApp('management', { path: '/security/api_keys/create' });

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiFlexGroup direction="column" gutterSize="l">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const status =
            stepNum === currentStep ? 'current' : stepNum < currentStep ? 'complete' : 'incomplete';
          return (
            <EuiFlexItem key={stepNum} grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiStepNumber number={stepNum} status={status} titleSize="xs" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s" color={status === 'incomplete' ? 'subdued' : undefined}>
                    <strong>{label}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        })}

        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <CredentialField
            label={i18n.translate('vectordbOnboarding.wizard.rail.urlLabel', {
              defaultMessage: 'Elasticsearch URL',
            })}
            value={elasticsearchUrl}
            isLoading={isLoading}
            copyAriaLabel={i18n.translate('vectordbOnboarding.wizard.rail.copyUrl', {
              defaultMessage: 'Copy Elasticsearch URL',
            })}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <CredentialField
            label={i18n.translate('vectordbOnboarding.wizard.rail.apiKeyLabel', {
              defaultMessage: 'API key',
            })}
            value={apiKey}
            isLoading={isLoading}
            copyAriaLabel={i18n.translate('vectordbOnboarding.wizard.rail.copyApiKey', {
              defaultMessage: 'Copy API key',
            })}
            fallback={
              <EuiButton
                size="s"
                iconType="key"
                onClick={goToApiKeys}
                data-test-subj="vectordbWizardCreateApiKey"
              >
                {i18n.translate('vectordbOnboarding.wizard.rail.createApiKey', {
                  defaultMessage: 'Create API key',
                })}
              </EuiButton>
            }
          />
        </EuiFlexItem>

        {docsHref ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="none" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink href={docsHref} target="_blank" external data-test-subj="vectordbWizardDocs">
                {docsLabel}
              </EuiLink>
            </EuiFlexItem>
          </>
        ) : null}

        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            size="s"
            flush="left"
            onClick={onSkip}
            data-test-subj="vectordbWizardSkip"
          >
            {i18n.translate('vectordbOnboarding.wizard.skip', { defaultMessage: 'Skip' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

interface StepPanelProps {
  title?: string;
  description?: string;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
}

const StepPanel: React.FC<StepPanelProps> = ({
  title,
  description,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  children,
}) => (
  <EuiPanel hasShadow={false} paddingSize="l">
    {title ? (
      <EuiTitle size="l">
        <h1>{title}</h1>
      </EuiTitle>
    ) : null}
    {description ? (
      <>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </>
    ) : null}
    {title || description ? <EuiSpacer size="m" /> : null}
    {children}
    {onBack || onNext ? (
      <>
        <EuiSpacer size="l" />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m">
          <EuiFlexItem grow={false}>
            {onBack ? (
              <EuiButtonEmpty
                iconType="arrowLeft"
                onClick={onBack}
                data-test-subj="vectordbWizardBack"
              >
                {i18n.translate('vectordbOnboarding.wizard.back', {
                  defaultMessage: 'Back',
                })}
              </EuiButtonEmpty>
            ) : (
              <span />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {onNext ? (
              <EuiButton
                fill
                iconType="arrowRight"
                iconSide="right"
                onClick={onNext}
                isDisabled={nextDisabled}
                data-test-subj="vectordbWizardNext"
              >
                {nextLabel ??
                  i18n.translate('vectordbOnboarding.wizard.next', {
                    defaultMessage: 'Next',
                  })}
              </EuiButton>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    ) : null}
  </EuiPanel>
);

export const StepLayout: React.FC<StepLayoutProps> = ({
  currentStep,
  title,
  description,
  docsLabel,
  docsHref,
  variant = 'panel',
  onSkip,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  children,
}) => {
  const {
    services: { chrome },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    chrome.setIsVisible(false);
    return () => chrome.setIsVisible(true);
  }, [chrome]);

  const isHero = variant === 'hero';

  const mainContentStyles = css`
    min-height: calc(100vh - 96px);
    display: flex;
    flex-direction: column;
    justify-content: center;
  `;

  const sidebarStyles = css`
    min-width: ${euiTheme.base * 13.75}px;
    max-width: ${euiTheme.base * 17.5}px;
  `;

  return (
    <EuiPageTemplate restrictWidth panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiFlexGroup gutterSize="l" alignItems="center" responsive={false}>
          <EuiFlexItem grow={3}>
            <div css={mainContentStyles}>
              <div>
                {isHero ? (
                  children
                ) : (
                  <StepPanel
                    title={title}
                    description={description}
                    onBack={onBack}
                    onNext={onNext}
                    nextLabel={nextLabel}
                    nextDisabled={nextDisabled}
                  >
                    {children}
                  </StepPanel>
                )}
              </div>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={1} css={sidebarStyles}>
            <StepRail
              currentStep={currentStep}
              onSkip={onSkip}
              docsLabel={docsLabel}
              docsHref={docsHref}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
