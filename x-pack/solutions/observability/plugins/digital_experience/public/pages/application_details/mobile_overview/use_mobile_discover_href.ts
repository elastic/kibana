/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { mobilePanelDiscoverEsql } from '../../../../common/mobile/discover';
import { useDiscoverHref } from '../../../hooks/use_discover_href';
import { useEnvironment } from '../../../hooks/use_environment';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';

/**
 * The Discover link of a mobile application's page, `undefined` without access to Discover. Built
 * from the URL's filters and time range, so it always matches what the page shows.
 */
export const useMobileDiscoverHref = (serviceName: string): string | undefined => {
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const { value: osName } = useQueryParam('osName');
  const { value: release } = useQueryParam('release');

  const esql = useMemo(
    () => mobilePanelDiscoverEsql({ serviceName, osName, release }, { environment }),
    [serviceName, osName, release, environment]
  );
  const discoverTimeRange = useMemo(
    () => ({ from: timeRange.rangeFrom, to: timeRange.rangeTo }),
    [timeRange.rangeFrom, timeRange.rangeTo]
  );
  return useDiscoverHref(esql, discoverTimeRange);
};
