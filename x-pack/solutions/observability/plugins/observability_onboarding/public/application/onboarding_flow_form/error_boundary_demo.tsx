/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiPanel } from '@elastic/eui';
import {
  TRANSIENT_NAVIGATION_WINDOW_MS,
  DEFAULT_MAX_ERROR_DURATION_MS,
} from '@kbn/shared-ux-error-boundary/src/services/error_service';
import { KibanaErrorBoundary } from '../../../../../../../../src/platform/packages/shared/shared-ux/error_boundary/src/ui/error_boundary';
import { KibanaSectionErrorBoundary } from '../../../../../../../../src/platform/packages/shared/shared-ux/error_boundary/src/ui/section_error_boundary';

const ErrorComponent: React.FC<{ duration: number; onNavigate: () => void }> = ({
  duration,
  onNavigate,
}) => {
  React.useEffect(() => {
    // Set timer immediately, don't clear it even if component unmounts
    const timer = setTimeout(() => {
      onNavigate();
    }, duration);

    // Don't return cleanup function to allow timer to persist after unmount
    throw new Error('Simulated section error for demonstration');
    
  }, []);
  return null;
};

const BreakingErrorComponent: React.FC = () => {
  throw new Error('Simulated breaking error for demonstration');
};

// Wrapper component to contain the breaking error boundary
const ContainedBreakingError: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  return (
    <EuiPanel color="danger" paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              {i18n.translate(
                'xpack.observability_onboarding.containedBreakingError.strong.breakingErrorDemoAreaLabel',
                { defaultMessage: 'Breaking Error Demo Area' }
              )}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <KibanaErrorBoundary>
            <BreakingErrorComponent />
          </KibanaErrorBoundary>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            data-test-subj="observabilityOnboardingContainedBreakingErrorResetDemoButton"
            size="s"
            onClick={onReset}
          >
            {i18n.translate('xpack.observability_onboarding.containedBreakingError.resetDemoButtonLabel', { defaultMessage: 'Reset Demo' })}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const ErrorBoundaryDemo: React.FC = () => {
  const [errorDuration, setErrorDuration] = useState<number | null>(null);
  const [showSectionError, setShowSectionError] = useState(false);
  const [showBreakingError, setShowBreakingError] = useState(false);

  const handleThrowSectionError = (duration: number) => {
    // Move history back one step after duration
    setTimeout(() => {
      window.history.back();
    }, duration);

    setErrorDuration(duration);
    setShowSectionError(true);
  };

  const handleNavigateBack = () => {
    window.history.back();
  };

  const handleThrowBreakingError = () => {
    setShowBreakingError(true);
  };

  const handleResetBreakingError = () => {
    setShowBreakingError(false);
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText>
          <strong>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.strong.errorBoundaryTelemetryDemoLabel', { defaultMessage: 'Error Boundary Telemetry Demo' })}</strong>
          <br />
          <br />
          {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.thisDemonstratesTheErrorTextLabel', { defaultMessage: 'This demonstrates the error boundary reporting behavior:' })}<br />
          <br />
          <strong>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.strong.keyTimingBehaviorLabel', { defaultMessage: 'Key Timing Behavior:' })}</strong>
          <ul>
            <li>
              <strong>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.strong.transientNavigationWindowLabel', { defaultMessage: 'Transient Navigation Window:' })}</strong> {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.errorReportingWaitsForLabel', { defaultMessage: 'Error reporting waits for a minimum of' })}{' '}
              <code>{TRANSIENT_NAVIGATION_WINDOW_MS}{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.code.msLabel', { defaultMessage: 'ms' })}</code> {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.transientnavigationwindowmsToCaptureAnyLabel', { defaultMessage: '(TRANSIENT_NAVIGATION_WINDOW_MS) to
              capture any navigation events that occur immediately after the error. This helps
              identify truly transient errors that users never see.' })}</li>
            <li>
              <strong>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.strong.msButtonLabel', { defaultMessage: '100ms Button:' })}</strong> {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.navigationOccursAtmsLabel', { defaultMessage: 'Navigation occurs at 100ms, which is within the
              transient window. The reported render duration will be' })}{' '}
              <code>~{TRANSIENT_NAVIGATION_WINDOW_MS}{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.code.msLabel', { defaultMessage: 'ms' })}</code>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.AndTelemetryWillLabel', { defaultMessage: ', and telemetry will include' })}{' '}
              <code>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.code.hastransientnavigationTrueLabel', { defaultMessage: 'has_transient_navigation: true' })}</code>.
            </li>
            <li>
              <strong>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.strong.msButtonLabel', { defaultMessage: '400ms Button:' })}</strong> {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.navigationOccursAtmsLabel', { defaultMessage: 'Navigation occurs at 400ms, which is after the
              transient window. The reported render duration will be approximately' })}{' '}
              <code>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.code.msLabel', { defaultMessage: '~400ms' })}</code> {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.withLabel', { defaultMessage: 'with' })}<code>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.code.hastransientnavigationFalseLabel', { defaultMessage: 'has_transient_navigation: false' })}</code> {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.sinceNavigationDidntOccurLabel', { defaultMessage: 'since navigation
              didn\'t occur within the' })}{TRANSIENT_NAVIGATION_WINDOW_MS}{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.msTransientWindowLabel', { defaultMessage: 'ms transient window.' })}</li>
            <li>
              <strong>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.strong.throwErrorButtonLabel', { defaultMessage: 'Throw Error Button:' })}</strong> {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.alwaysReportedAfterLabel', { defaultMessage: 'Always reported after' })}{' '}
              <code>{TRANSIENT_NAVIGATION_WINDOW_MS}{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.code.msLabel', { defaultMessage: 'ms' })}</code> {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.transientnavigationwindowmsMinimumWaitButLabel', { defaultMessage: '(TRANSIENT_NAVIGATION_WINDOW_MS)
              minimum wait, but the actual reporting occurs either:' })}<ul>
                <li>{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.whenUserInteractsrefreshnavigationLabel', { defaultMessage: 'When user interacts (refresh/navigation) - via cleanup handlers' })}</li>
                <li>
                  {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.atLabel', { defaultMessage: 'At' })}<code>{Math.floor(DEFAULT_MAX_ERROR_DURATION_MS / 1000)}{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.code.secondLabel', { defaultMessage: '-second' })}</code>{' '}
                  {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.li.defaultmaxerrordurationmsAutocommitTimeoutAsLabel', { defaultMessage: '(DEFAULT_MAX_ERROR_DURATION_MS) auto-commit timeout as a safety mechanism' })}</li>
              </ul>
            </li>
          </ul>
          <br />
          <strong>
            {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.strong.checkTheBrowserConsoleLabel', { defaultMessage: 'Check the browser Console for telemetry logs to see the actual timing and navigation
            flags.' })}</strong>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiButton
              onClick={() => handleThrowSectionError(100)}
              data-test-subj="error-boundary-demo-section-100ms"
              disabled={showSectionError}
            >
              {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.throwAndNavunmountButtonLabel', { defaultMessage: 'Throw and nav (unmount after 100ms)' })}</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              onClick={() => handleThrowSectionError(500)}
              data-test-subj="error-boundary-demo-section-400ms"
              disabled={showSectionError}
            >
              {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.throwAndNavunmountButtonLabel', { defaultMessage: 'Throw and nav (unmount after 400ms)' })}</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              onClick={handleThrowBreakingError}
              data-test-subj="error-boundary-demo-breaking"
              disabled={showBreakingError}
            >
              {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.throwErrorButtonLabel', { defaultMessage: 'Throw error' })}</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Section Error Demo Area */}
      {showSectionError && errorDuration !== null && (
        <EuiFlexItem>
          <EuiPanel color="warning" paddingSize="m">
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.strong.sectionErrorDemoAreaLabel', { defaultMessage: 'Section Error Demo Area (Duration:' })}{errorDuration}{i18n.translate('xpack.observability_onboarding.errorBoundaryDemo.strong.msWillNavigateLabel', { defaultMessage: 'ms) - Will navigate back after
                    timeout' })}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <KibanaSectionErrorBoundary sectionName="Demo Section">
                  <ErrorComponent duration={errorDuration} onNavigate={handleNavigateBack} />
                </KibanaSectionErrorBoundary>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Breaking Error Demo Area */}
      {showBreakingError && (
        <EuiFlexItem>
          <ContainedBreakingError onReset={handleResetBreakingError} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
