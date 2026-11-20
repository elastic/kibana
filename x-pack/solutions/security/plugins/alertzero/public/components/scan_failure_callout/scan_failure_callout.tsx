/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { SYSTEM_SECURITY_WORKER_CATALOG } from '@kbn/alertzero-common';
import type { CoreStart } from '@kbn/core/public';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useScanFailureDismissal } from '../../hooks/use_scan_failure_dismissal';
import { useScanFailures } from '../../hooks/use_scan_failures';
import type { UiErrorSurface } from '../../telemetry';
import { useReportErrorShown } from '../../telemetry';
import { ViewExecutionsLink } from '../view_executions_link/view_executions_link';
import { SCAN_FAILURE_BODY, SCAN_FAILURE_TITLE, SCAN_FAILURE_UNKNOWN } from './translations';

const WORKER_NAMES = new Map<string, string>(
  SYSTEM_SECURITY_WORKER_CATALOG.map((entry) => [entry.id, entry.name])
);

export interface ScanFailureCalloutProps {
  /** The page the callout sits on, for telemetry. */
  surface: Extract<UiErrorSurface, 'queue' | 'onboarding'>;
  /** Wraps the callout, so the wrapper is only rendered when the callout is. */
  wrapper?: (callout: JSX.Element) => JSX.Element;
}

export const ScanFailureCallout: React.FC<ScanFailureCalloutProps> = ({
  surface,
  wrapper,
}): JSX.Element | null => {
  const { data, isLoading, error } = useScanFailures();
  const { dismissedAt, dismiss } = useScanFailureDismissal();
  const {
    services: { application },
  } = useKibana<CoreStart>();

  const dismissedAtMs = dismissedAt == null ? Number.NaN : Date.parse(dismissedAt);
  const isNew = (failedAt: string | null): boolean =>
    Number.isNaN(dismissedAtMs) || (failedAt != null && Date.parse(failedAt) > dismissedAtMs);

  const loaded = isLoading || error != null ? undefined : data;
  const workers =
    loaded?.workers.flatMap((worker) => {
      const name = WORKER_NAMES.get(worker.workerId);
      return name == null || !isNew(worker.lastFailedAt) ? [] : [{ ...worker, name }];
    }) ?? [];
  const showUnknown = loaded != null && loaded.unknown && isNew(loaded.lastFailedAt);
  const isShown = workers.length > 0 || showUnknown;

  // Before the early return, so the hook runs on every render.
  useReportErrorShown({ errorClass: 'worker_scan_failed', isShown, surface });

  if (!isShown) {
    return null;
  }

  const callout = (
    <EuiCallOut
      announceOnMount
      title={SCAN_FAILURE_TITLE}
      color="danger"
      iconType="warning"
      onDismiss={dismiss}
      data-test-subj="alertZeroScanFailureCallout"
    >
      <p>{SCAN_FAILURE_BODY}</p>
      <ul>
        {workers.map((worker) => (
          <li key={worker.workerId}>
            <ViewExecutionsLink
              workerId={worker.workerId}
              workerName={worker.name}
              label={worker.name}
              executionsHref={application.getUrlForApp(WORKFLOWS_APP_ID, {
                path: `/${encodeURIComponent(
                  worker.workflowId
                )}?executionStatuses=failed&tab=executions`,
              })}
            />
          </li>
        ))}
        {showUnknown ? (
          <li data-test-subj="alertZeroScanFailureUnknown">{SCAN_FAILURE_UNKNOWN}</li>
        ) : null}
      </ul>
    </EuiCallOut>
  );

  return wrapper ? wrapper(callout) : callout;
};
