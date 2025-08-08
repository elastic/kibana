/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { useRunOnceErrors } from '../hooks/use_run_once_errors';
import { ManualTestRun } from '../../../state/manual_test_runs';
import { BrowserTestRunResult } from './browser_test_results';
import { SimpleTestResults } from './simple_test_results';
import { Locations } from '../../../../../../common/runtime_types';
import { useMonitorById } from '../../../hooks/use_monitor_by_id';

export function ManualTestRunMode({
  manualTestRun,
  onDone,
}: {
  manualTestRun: ManualTestRun;
  onDone: (testRunId: string) => void;
}) {
  const monitor = useMonitorById(manualTestRun.configId);

  const { expectPings } = useRunOnceErrors({
    testRunId: manualTestRun.testRunId!,
    locations: (monitor?.locations ?? []) as Locations,
    errors: manualTestRun.errors ?? [],
  });

  if (!manualTestRun.testRunId || !monitor) return null;

  const isBrowserMonitor = monitor.type === 'browser';

  return (
    <Fragment key={manualTestRun.testRunId}>
      {isBrowserMonitor ? (
        <BrowserTestRunResult
          name={monitor.name}
          expectPings={expectPings}
          onDone={onDone}
          testRunId={manualTestRun.testRunId}
          onProgress={() => {}}
        />
      ) : (
        <SimpleTestResults
          name={monitor.name}
          expectPings={expectPings}
          onDone={onDone}
          testRunId={manualTestRun.testRunId}
        />
      )}
    </Fragment>
  );
}
