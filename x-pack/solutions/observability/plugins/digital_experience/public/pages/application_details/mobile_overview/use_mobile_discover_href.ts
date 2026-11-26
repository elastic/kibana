/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getDateISORange } from '@kbn/timerange';
import {
  mobileCrashesDiscoverEsql,
  mobilePanelDiscoverEsql,
} from '../../../../common/mobile/discover';
import { MOBILE_MAX_CRASH_DELAY_HOURS } from '../../../../common/sessions';
import type { MobileApplicationTabId } from '../../../../common/types/applications';
import { useDiscoverHref } from '../../../hooks/use_discover_href';
import { useEnvironment } from '../../../hooks/use_environment';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';

/**
 * A time range end `hours` later, still relative when it is, e.g. `now+24h`, so Discover resolves
 * "now" when the link is opened rather than when it was built.
 */
export const laterBy = (to: string, hours: number): string =>
  to.startsWith('now')
    ? `${to}+${hours}h`
    : new Date(
        Date.parse(getDateISORange({ from: to, to }).endDate) + hours * 60 * 60 * 1000
      ).toISOString();

/**
 * The Discover link of a mobile application's tab, `undefined` without access to Discover. Built
 * from the URL's filters and time range, so it always matches what the tab shows. The Crashes
 * tab's lists its crashes, by when they happened and the release that crashed, in a time range
 * that reaches as far past the tab's as a crash can be sent late.
 */
export const useMobileDiscoverHref = (
  serviceName: string,
  tab: MobileApplicationTabId
): string | undefined => {
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const { value: osName } = useQueryParam('osName');
  const { value: release } = useQueryParam('release');

  const esql = useMemo(
    () =>
      (tab === 'crashes' ? mobileCrashesDiscoverEsql : mobilePanelDiscoverEsql)(
        { serviceName, osName, release },
        { environment }
      ),
    [tab, serviceName, osName, release, environment]
  );
  const discoverTimeRange = useMemo(
    () => ({
      from: timeRange.rangeFrom,
      to:
        tab === 'crashes'
          ? laterBy(timeRange.rangeTo, MOBILE_MAX_CRASH_DELAY_HOURS)
          : timeRange.rangeTo,
    }),
    [tab, timeRange.rangeFrom, timeRange.rangeTo]
  );
  return useDiscoverHref(esql, discoverTimeRange);
};
