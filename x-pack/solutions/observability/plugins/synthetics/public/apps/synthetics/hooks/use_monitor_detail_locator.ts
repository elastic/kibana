/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { syntheticsMonitorDetailLocatorID } from '@kbn/observability-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { getMonitorSpaceToAppend } from './use_edit_monitor_locator';
import { useKibanaSpace } from '../../../hooks/use_kibana_space';
import { ClientPluginsStart } from '../../../plugin';

export interface MonitorDetailLocatorParams {
  configId: string;
  locationId?: string;
  timeRange?: TimeRange;
  spaces?: string[];
  tabId?: string;
}

export function useMonitorDetailLocator({
  configId,
  locationId,
  spaces,
  timeRange,
  tabId,
}: MonitorDetailLocatorParams) {
  const { space } = useKibanaSpace();
  const [monitorUrl, setMonitorUrl] = useState<string | undefined>(undefined);
  const locator = useKibana<ClientPluginsStart>().services?.share?.url.locators.get(
    syntheticsMonitorDetailLocatorID
  );

  useEffect(() => {
    async function generateUrl() {
      const url = locator?.getRedirectUrl({
        configId,
        locationId,
        timeRange,
        tabId,
        ...getMonitorSpaceToAppend(space, spaces),
      });
      setMonitorUrl(url);
    }
    generateUrl();
  }, [locator, configId, locationId, spaces, space?.id, space, timeRange, tabId]);

  return monitorUrl;
}
