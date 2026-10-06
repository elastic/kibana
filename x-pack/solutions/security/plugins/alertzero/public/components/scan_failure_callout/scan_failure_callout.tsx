/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { SYSTEM_SECURITY_WORKER_CATALOG } from '@kbn/alertzero-common';
import { Link } from 'react-router-dom';
import { useScanFailures } from '../../hooks/use_scan_failures';
import { SCAN_FAILURE_BODY, SCAN_FAILURE_TITLE, SCAN_FAILURE_UNKNOWN } from './translations';

const WORKER_NAMES = new Map<string, string>(
  SYSTEM_SECURITY_WORKER_CATALOG.map((entry) => [entry.id, entry.name])
);

export const ScanFailureCallout: React.FC = () => {
  const { data, isLoading, error } = useScanFailures();

  if (isLoading || error != null || data == null) {
    return null;
  }

  const workers = data.workers.flatMap((worker) => {
    const name = WORKER_NAMES.get(worker.workerId);
    return name == null ? [] : [{ ...worker, name }];
  });

  if (workers.length === 0 && !data.unknown) {
    return null;
  }

  return (
    <EuiCallOut
      announceOnMount
      title={SCAN_FAILURE_TITLE}
      color="danger"
      iconType="warning"
      data-test-subj="alertZeroScanFailureCallout"
    >
      <p>{SCAN_FAILURE_BODY}</p>
      <ul>
        {workers.map((worker) => (
          <li key={worker.workerId}>
            <Link to={`/watches/${worker.watchId}`}>{worker.name}</Link>
          </li>
        ))}
        {data.unknown ? (
          <li data-test-subj="alertZeroScanFailureUnknown">{SCAN_FAILURE_UNKNOWN}</li>
        ) : null}
      </ul>
    </EuiCallOut>
  );
};
