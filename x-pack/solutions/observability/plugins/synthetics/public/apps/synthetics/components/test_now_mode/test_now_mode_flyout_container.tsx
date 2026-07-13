/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useTestFlyoutOpen } from './hooks/use_test_flyout_open';
import { TestNowModeFlyout } from './test_now_mode_flyout';
import { ManualTestRunMode } from './manual_test_run_mode/manual_test_run_mode';
import { useSyntheticsRefreshContext } from '../../contexts';
import {
  hideTestNowFlyoutAction,
  manualTestRunUpdateAction,
  testNowRunsSelector,
  TestRunStatus,
} from '../../state/manual_test_runs';
import { useMonitorById } from '../../hooks/use_monitor_by_id';

export function TestNowModeFlyoutContainer() {
  const dispatch = useDispatch();
  const testNowRuns = useSelector(testNowRunsSelector);
  const { refreshApp } = useSyntheticsRefreshContext();

  const flyoutOpenTestRun = useTestFlyoutOpen();

  const onDone = useCallback(
    (testRunId: any) => {
      dispatch(
        manualTestRunUpdateAction({
          testRunId,
          status: TestRunStatus.COMPLETED,
        })
      );
      refreshApp();
    },
    [dispatch, refreshApp]
  );

  const handleFlyoutClose = useCallback(
    (testRunId: any) => {
      dispatch(
        manualTestRunUpdateAction({
          testRunId,
          isTestNowFlyoutOpen: false,
        })
      );
    },
    [dispatch]
  );

  const monitor = useMonitorById(flyoutOpenTestRun?.configId);

  const testRun = useMemo(() => {
    return flyoutOpenTestRun?.testRunId && monitor
      ? {
          id: flyoutOpenTestRun.testRunId,
          monitor,
          name: monitor.name,
        }
      : undefined;
  }, [flyoutOpenTestRun, monitor]);

  // Open the flyout as soon as the run is initiated (status `loading`) so it shows the
  // "Pushing the monitor to service..." state immediately, rather than waiting for the
  // trigger-test API to return a `testRunId`. `TestNowModeFlyout` handles the missing `testRun`.
  const flyout =
    flyoutOpenTestRun && monitor ? (
      <TestNowModeFlyout
        testRun={testRun}
        name={monitor.name}
        inProgress={
          flyoutOpenTestRun.status === 'in-progress' || flyoutOpenTestRun.status === 'loading'
        }
        onClose={() =>
          flyoutOpenTestRun.testRunId
            ? handleFlyoutClose(flyoutOpenTestRun.testRunId)
            : dispatch(hideTestNowFlyoutAction())
        }
        onDone={onDone}
        isPushing={flyoutOpenTestRun.status === 'loading'}
        errors={flyoutOpenTestRun.errors ?? []}
      />
    ) : null;

  return (
    <>
      {Object.values(testNowRuns)
        // Exclude the run currently shown in the flyout: it already polls via the flyout's
        // `BrowserTestRunResult`, so rendering it here too would double every journey/steps
        // request. `ManualTestRunMode` is only for background runs (progress toasts).
        .filter(
          (val) =>
            val.testRunId &&
            !val.isTestNowFlyoutOpen &&
            (val.status === 'in-progress' || val.status === 'loading')
        )
        .map((manualTestRun) => (
          <ManualTestRunMode
            key={manualTestRun.testRunId}
            manualTestRun={manualTestRun}
            onDone={onDone}
          />
        ))}
      {flyout}
    </>
  );
}
