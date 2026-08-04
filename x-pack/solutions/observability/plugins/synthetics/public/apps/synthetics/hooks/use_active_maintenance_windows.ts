/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetchActiveMaintenanceWindows } from '@kbn/alerts-ui-shared';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { MaintenanceWindow } from '@kbn/alerts-ui-shared/src/maintenance_window_callout/types';
import type { ClientPluginsStart } from '../../../plugin';

/**
 * Fetches all active maintenance windows and filters to only those that are
 * referenced by the monitor (in monitorMWIds).
 *
 * Reusable across the overview monitors page and the pending changes detection.
 */
export const useActiveMaintenanceWindows = (monitorMWIds: string[]): MaintenanceWindow[] => {
  const services = useKibana<ClientPluginsStart>().services;
  const { data } = useFetchActiveMaintenanceWindows(services, { enabled: true });

  return useMemo(() => {
    if (!monitorMWIds.length) {
      return [];
    }
    return (data ?? []).filter((mw) => monitorMWIds.includes(mw.id));
  }, [data, monitorMWIds]);
};
