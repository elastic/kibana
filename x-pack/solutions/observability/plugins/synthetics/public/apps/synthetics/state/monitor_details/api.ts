/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { apiService } from '../../../../utils/api_service';
import type {
  Ping,
  PingsResponse,
  SyntheticsMonitorWithId,
} from '../../../../../common/runtime_types';
import {
  EncryptedSyntheticsMonitorCodec,
  PingsResponseType,
} from '../../../../../common/runtime_types';
import { INITIAL_REST_VERSION, SYNTHETICS_API_URLS } from '../../../../../common/constants';

export interface MostRecentPingsRequest {
  monitorId: string;
  locationId: string;
  from?: string;
  to?: string;
  size?: number;
  pageIndex?: number;
  statusFilter?: 'up' | 'down';
  remoteName?: string;
}

export const fetchMonitorRecentPings = async ({
  monitorId,
  locationId,
  from,
  to,
  size = 10,
  pageIndex = 0,
  statusFilter,
  remoteName,
}: MostRecentPingsRequest): Promise<PingsResponse> => {
  const locations = JSON.stringify([locationId]);
  const sort = 'desc';

  return await apiService.get(
    SYNTHETICS_API_URLS.PINGS,
    {
      monitorId,
      // Callers normally pass an explicit UI date range; this fallback is only
      // used when none is provided. Default to the last 24h (instead of 30
      // days) so the query doesn't fan out across long-retention frozen-tier
      // indices when no range is supplied.
      from: from ?? moment().subtract(24, 'hours').toISOString(),
      to: to ?? moment().toISOString(),
      locations,
      sort,
      size,
      pageIndex,
      status: statusFilter,
      ...(remoteName ? { remoteName } : {}),
    },
    PingsResponseType
  );
};

export const fetchLatestTestRun = async ({
  monitorId,
  locationLabel,
}: {
  monitorId: string;
  locationLabel?: string;
}): Promise<{ ping?: Ping }> => {
  return apiService.get<{ ping?: Ping }>(SYNTHETICS_API_URLS.LATEST_TEST_RUN, {
    monitorId,
    locationLabel,
    version: INITIAL_REST_VERSION,
  });
};

export const fetchSyntheticsMonitor = async ({
  monitorId,
  spaceId,
}: {
  monitorId: string;
  spaceId?: string;
}): Promise<SyntheticsMonitorWithId> => {
  return apiService.get<SyntheticsMonitorWithId>(
    SYNTHETICS_API_URLS.GET_SYNTHETICS_MONITOR.replace('{monitorId}', monitorId),
    {
      internal: true,
      spaceId,
      version: INITIAL_REST_VERSION,
    },
    EncryptedSyntheticsMonitorCodec
  );
};
