/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { CoreStart } from '@kbn/core/public';
import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const SCAN_FAILURE_DISMISSED_AT_STORAGE_KEY_PREFIX =
  'alertzero.scanFailureCallout.dismissedAt';

interface ScanFailureDismissal {
  /** ISO time of the last dismissal in this space. */
  dismissedAt: string | undefined;
  dismiss: () => void;
}

export const useScanFailureDismissal = (): ScanFailureDismissal => {
  const {
    services: { http },
  } = useKibana<CoreStart>();
  const { spaceId } = getSpaceIdFromPath(http.basePath.get(), http.basePath.serverBasePath);
  const [dismissedAt, setDismissedAt] = useLocalStorage<string>(
    `${SCAN_FAILURE_DISMISSED_AT_STORAGE_KEY_PREFIX}.${spaceId}`
  );

  const dismiss = useCallback(() => setDismissedAt(new Date().toISOString()), [setDismissedAt]);

  return { dismissedAt, dismiss };
};
