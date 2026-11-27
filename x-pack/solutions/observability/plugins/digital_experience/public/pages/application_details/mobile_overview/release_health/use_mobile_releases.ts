/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MobileReleasesResponse } from '../../../../../common/types/mobile';
import { useMobilePanelData, type MobilePanelRequest } from '../use_mobile_panel_data';

export interface MobileReleasesState {
  /** The response of the current filters, `undefined` while they load. */
  releases: MobileReleasesResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

const fetchReleases: MobilePanelRequest<MobileReleasesResponse> = (apiClient, options) =>
  apiClient.fetch(
    'GET /internal/digital_experience/mobile_applications/{serviceName}/releases',
    options
  );

/** A mobile application's release health, over the URL's filters and range. */
export const useMobileReleases = (serviceName: string): MobileReleasesState => {
  const { response, ...state } = useMobilePanelData(fetchReleases, serviceName);
  return { releases: response, ...state };
};
