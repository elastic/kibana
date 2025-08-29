/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';
import { syntheticsMonitorDetailLocatorID } from '@kbn/observability-plugin/common';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { type TimeRange } from '@kbn/es-query';
import { getMonitorSpaceToAppend } from './use_edit_monitor_locator';
import { useKibanaSpace } from '../../../hooks/use_kibana_space';
import type { ClientPluginsStart } from '../../../plugin';

export interface MonitorDetailLocatorParams {
  configId: string;
  locationId?: string;
  timeRange?: TimeRange;
  spaces?: string[];
  tabId?: string;
  useAbsoluteDate?: boolean;
}

export function useMonitorDetailLocator({
  configId,
  locationId,
  spaces,
  timeRange,
  tabId,
  useAbsoluteDate = false,
}: MonitorDetailLocatorParams) {
  const { space } = useKibanaSpace();
  const [monitorUrl, setMonitorUrl] = useState<string | undefined>(undefined);
  const locators = useKibana<ClientPluginsStart>().services?.share?.url.locators;
  const locator = useMemo(() => {
    return locators?.get(syntheticsMonitorDetailLocatorID);
  }, [locators]);

  useEffect(() => {
    const url = locator?.getRedirectUrl({
      configId,
      locationId,
      timeRange: useAbsoluteDate ? convertToAbsoluteTimeRange(timeRange) : timeRange,
      tabId,
      ...getMonitorSpaceToAppend(space, spaces),
    });
    setMonitorUrl(url);
  }, [locator, configId, locationId, spaces, space, timeRange, tabId, useAbsoluteDate]);

  return monitorUrl;
}

export const convertToAbsoluteTimeRange = (timeRange?: TimeRange): TimeRange | undefined => {
  if (!timeRange) {
    return;
  }

  const absRange = getAbsoluteTimeRange(
    {
      from: timeRange.from,
      to: timeRange.to,
    },
    { forceNow: new Date() }
  );

  return {
    from: absRange.from,
    to: absRange.to,
  };
};
