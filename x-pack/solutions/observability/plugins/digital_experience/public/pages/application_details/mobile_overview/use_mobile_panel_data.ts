/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { DigitalExperienceApiClient } from '../../../hooks/use_api_client';
import { useApiClient } from '../../../hooks/use_api_client';
import { useFormatters } from '../../../hooks/use_formatters';
import { useMobileFiltersQuery, type MobileFiltersQuery } from './use_mobile_filters_query';

/** The params every section of the Overview sends: the page's filters and time zone. */
export interface MobilePanelParams {
  path: { serviceName: string };
  query: MobileFiltersQuery;
}

/** Fetches a section's response; module-level, so the hook's dependencies stay stable. */
export type MobilePanelRequest<TResponse> = (
  apiClient: DigitalExperienceApiClient,
  options: { signal: AbortSignal; params: MobilePanelParams }
) => Promise<TResponse>;

export interface MobilePanelDataState<TResponse> {
  /** The response of the current filters, `undefined` while they load. */
  response: TResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

/** A section of a mobile application's Overview, over the URL's filters and range. */
export const useMobilePanelData = <TResponse>(
  request: MobilePanelRequest<TResponse>,
  serviceName: string
): MobilePanelDataState<TResponse> => {
  const apiClient = useApiClient();
  const { timeZone } = useFormatters();
  const { toQuery, key } = useMobileFiltersQuery(timeZone);
  // The URL's params, not the times they resolve to, so a refresh resolves "now" again
  const paramsKey = JSON.stringify([serviceName, key]);

  const {
    value: fetched,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) => ({
      paramsKey,
      response: await request(apiClient, {
        signal,
        params: { path: { serviceName }, query: toQuery() },
      }),
    }),
    [request, apiClient, serviceName, toQuery, paramsKey],
    { unsetValueOnError: true }
  );
  // Loading from the render the params change in, so no frame shows the last response
  const isCurrent = fetched?.paramsKey === paramsKey;
  const isLoading = loading || (!isCurrent && !error);
  return {
    response: isLoading ? undefined : fetched?.response,
    isLoading,
    error: loading ? undefined : error,
    refresh,
  };
};
