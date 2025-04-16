/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataStream, PackageListItem } from '@kbn/fleet-plugin/common';
import { useGetDataStreams } from '@kbn/fleet-plugin/public';

export interface UseIntegrationsLastActivityParams {
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
}

export interface UseIntegrationsLastActivityResult {
  /**
   * Is true while the data is loading
   */
  isLoading: boolean;
  /**
   * Object that stores each integration name/last activity values
   */
  lastActivities: { [id: string]: number };
}

/**
 * Fetches dataStreams, finds all the dataStreams for each integration, takes the value of the latest updated stream.
 * Returns an object with the package name as the key and the last time it was synced (using data streams) as the value.
 */
export const useIntegrationsLastActivity = ({
  packages,
}: UseIntegrationsLastActivityParams): UseIntegrationsLastActivityResult => {
  const { data, isLoading } = useGetDataStreams();

  // Find all the matching dataStreams for our packages, take the most recently updated one for each package.
  const lastActivities: { [id: string]: number } = useMemo(() => {
    const la: { [id: string]: number } = {};
    packages.forEach((p: PackageListItem) => {
      const dataStreams = (data?.data_streams || []).filter(
        (d: DataStream) => d.package === p.name
      );
      dataStreams.sort((a, b) => b.last_activity_ms - a.last_activity_ms);
      const lastActivity = dataStreams.shift();

      if (lastActivity) {
        la[p.name] = lastActivity.last_activity_ms;
      }
    });
    return la;
  }, [data, packages]);

  return useMemo(
    () => ({
      isLoading,
      lastActivities,
    }),
    [isLoading, lastActivities]
  );
};
