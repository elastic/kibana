/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FAILED_TO_SCHEDULE } from './browser_test_results';
import { kibanaService } from '../../../../../utils/kibana_service';
import { useSimpleRunOnceMonitors } from '../hooks/use_simple_run_once_monitors';

interface Props {
  name: string;
  testRunId: string;
  expectPings: number;
  onDone: (testRunId: string) => void;
}
export function SimpleTestResults({ name, testRunId, expectPings, onDone }: Props) {
  const { summaryDocs, retriesExceeded } = useSimpleRunOnceMonitors({
    testRunId,
    expectSummaryDocs: expectPings,
  });

  useEffect(() => {
    if (retriesExceeded) {
      const { coreStart, toasts } = kibanaService;

      toasts.addDanger(
        {
          text: FAILED_TO_SCHEDULE,
          title: toMountPoint(
            <FormattedMessage
              id="xpack.synthetics.manualTestRun.failedTest.name"
              defaultMessage="Manual test run failed for {name}"
              values={{ name }}
            />,
            coreStart
          ),
        },
        {
          toastLifeTimeMs: 10000,
        }
      );
      onDone(testRunId);
    }
  }, [name, onDone, retriesExceeded, testRunId]);

  useEffect(() => {
    if (summaryDocs) {
      if (summaryDocs.length >= expectPings) {
        onDone(testRunId);
      }
    }
  }, [testRunId, expectPings, summaryDocs, onDone]);

  return <></>;
}
