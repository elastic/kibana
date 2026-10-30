/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useSignificantEventsAvailability } from '../data/availability/use_significant_events_availability';
import { useFetchSources } from '../data/sources/use_fetch_sources';
import { useKibana } from '../hooks/use_kibana';

const getDismissedStorageKey = (basePath: string): string =>
  `nightshift.detectionSetupBanner.dismissed:${basePath || 'default'}`;

export const useDetectionSetupBanner = ({
  suppressed,
}: {
  suppressed: boolean;
}): { isVisible: boolean; dismiss: () => void } => {
  const { application, http } = useKibana().services;
  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const { isAvailable } = useSignificantEventsAvailability();
  const sources = useFetchSources({
    select: (sourceList) => sourceList.length,
    showErrorToast: false,
  });
  const [isDismissed = false, setIsDismissed] = useLocalStorage<boolean>(
    getDismissedStorageKey(http.basePath.get()),
    false
  );
  const dismiss = useCallback(() => setIsDismissed(true), [setIsDismissed]);

  return {
    isVisible:
      !suppressed &&
      canManage &&
      isAvailable &&
      !sources.isLoading &&
      !sources.isError &&
      sources.data === 0 &&
      !isDismissed,
    dismiss,
  };
};
