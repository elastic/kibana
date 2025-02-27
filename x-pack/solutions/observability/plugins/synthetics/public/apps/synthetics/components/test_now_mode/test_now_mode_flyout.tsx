/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiErrorBoundary,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';

import { LoadingState } from '../monitors_page/overview/overview/monitor_detail_flyout';
import { ServiceLocationErrors, SyntheticsMonitor } from '../../../../../common/runtime_types';
import { TestNowMode } from './test_now_mode';

export interface TestRun {
  id: string;
  name: string;
  monitor: SyntheticsMonitor;
}

export function TestNowModeFlyout({
  name,
  testRun,
  onClose,
  onDone,
  inProgress,
  isPushing,
  errors,
  serviceError,
}: {
  name: string;
  serviceError?: Error;
  errors: ServiceLocationErrors;
  testRun?: TestRun;
  inProgress: boolean;
  isPushing: boolean;
  onClose: () => void;
  onDone: (testRunId: string) => void;
}) {
  const flyout = (
    <EuiFlyout
      type="push"
      size="m"
      paddingSize="m"
      maxWidth="44%"
      aria-labelledby={TEST_RESULT}
      onClose={onClose}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>
            {name}-{TEST_RESULTS}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiErrorBoundary>
          {isPushing && (
            <EuiCallOut color="primary">
              {PushingLabel} <EuiLoadingSpinner />
            </EuiCallOut>
          )}
          {testRun ? (
            <TestNowMode
              isPushing={isPushing}
              errors={errors}
              serviceError={serviceError}
              testRun={testRun}
              onDone={onDone}
            />
          ) : (
            !isPushing && <LoadingState />
          )}
        </EuiErrorBoundary>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          data-test-subj="syntheticsTestNowModeFlyoutButton"
          iconType="cross"
          onClick={onClose}
          flush="left"
        >
          {CLOSE_LABEL}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );

  return <>{(testRun || inProgress) && <EuiErrorBoundary>{flyout}</EuiErrorBoundary>}</>;
}

const TEST_RESULT = i18n.translate('xpack.synthetics.monitorManagement.testResult', {
  defaultMessage: 'Test result',
});

const TEST_RESULTS = i18n.translate('xpack.synthetics.monitorManagement.testResults', {
  defaultMessage: 'Test results',
});

const CLOSE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.closeButtonLabel', {
  defaultMessage: 'Close',
});

const PushingLabel = i18n.translate('xpack.synthetics.testRun.pushing.description', {
  defaultMessage: 'Pushing the monitor to service...',
});
