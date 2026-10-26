/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';

interface UseAlertDataLoadingParams {
  hasRuleIdFromMetadata: boolean;
  loadingAlertData: boolean;
  loadingPrivileges: boolean;
  hasAlertsRead: boolean;
  alertsData: Record<string, unknown>;
  alertId: string;
  refetchAlertData: (() => void) | null;
}

/**
 * Returns true while the component should show a loading spinner waiting for
 * alert data. Covers four states, all scoped to the live-fetch path
 * (attachments that have a rule ID in metadata skip the fetch entirely):
 *
 * 1. Alert data is actively loading.
 * 2. Alert privileges are still resolving (hasAlertsRead defaults false while loading).
 * 3. The first fetch has not started yet (refetchAlertData === null).
 * 4. The first fetch returned no data and a 300ms retry is pending.
 *
 * The retry gate (hasRetried) is stored in a ref so setting it does not trigger
 * a re-render. It is set inside the timer callback — not before — so a re-render
 * during the delay neither cancels the retry nor permanently closes the gate.
 */
export const useAlertDataLoading = ({
  hasRuleIdFromMetadata,
  loadingAlertData,
  loadingPrivileges,
  hasAlertsRead,
  alertsData,
  alertId,
  refetchAlertData,
}: UseAlertDataLoadingParams): boolean => {
  const hasRetried = useRef(false);

  const needsLiveFetch = !hasRuleIdFromMetadata;
  const waitingForPrivileges = needsLiveFetch && loadingPrivileges;
  const waitingForFirstFetch = needsLiveFetch && hasAlertsRead && refetchAlertData === null;

  const firstFetchReturnedNoData =
    needsLiveFetch &&
    !loadingAlertData &&
    refetchAlertData !== null &&
    alertsData[alertId] == null &&
    !hasRetried.current;

  useEffect(() => {
    if (!firstFetchReturnedNoData || refetchAlertData == null) return;
    const timer = setTimeout(() => {
      hasRetried.current = true;
      refetchAlertData();
    }, 300);
    return () => clearTimeout(timer);
  }, [firstFetchReturnedNoData, refetchAlertData]);

  return (
    loadingAlertData || waitingForPrivileges || waitingForFirstFetch || firstFetchReturnedNoData
  );
};
