/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getDateISORange } from '@kbn/timerange';
import {
  mobileCrashesDiscoverLink,
  mobilePanelDiscoverEsql,
} from '../../../../common/mobile/discover';
import type { MobileApplicationTabId } from '../../../../common/types/applications';
import { useDiscoverHref } from '../../../hooks/use_discover_href';
import { useEnvironment } from '../../../hooks/use_environment';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';

/**
 * The Discover link of a mobile application's tab, `undefined` without access to Discover. Built
 * from the URL's filters and time range, so it always matches what the tab shows. The Crashes
 * tab's lists its crashes, by when they happened and the release that crashed, in a time range
 * that takes the crashes sent late.
 */
export const useMobileDiscoverHref = (
  serviceName: string,
  tab: MobileApplicationTabId
): string | undefined => {
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const { value: osName } = useQueryParam('osName');
  const { value: release } = useQueryParam('release');

  const { esql, discoverTimeRange } = useMemo(() => {
    const filters = { serviceName, osName, release };
    if (tab === 'crashes') {
      const { startDate, endDate } = getDateISORange({
        from: timeRange.rangeFrom,
        to: timeRange.rangeTo,
      });
      const link = mobileCrashesDiscoverLink(filters, {
        environment,
        start: Date.parse(startDate),
        end: Date.parse(endDate),
      });
      return { esql: link.esql, discoverTimeRange: link.timeRange };
    }
    return {
      esql: mobilePanelDiscoverEsql(filters, { environment }),
      discoverTimeRange: { from: timeRange.rangeFrom, to: timeRange.rangeTo },
    };
  }, [tab, serviceName, osName, release, environment, timeRange.rangeFrom, timeRange.rangeTo]);
  return useDiscoverHref(esql, discoverTimeRange);
};
