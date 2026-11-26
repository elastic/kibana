/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MobileAppStartsResponse } from '../../../../../common/types/mobile';
import { useMobilePanelData, type MobilePanelRequest } from '../use_mobile_panel_data';

export interface MobileAppStartsState {
  /** The response of the current filters, `undefined` while they load. */
  appStarts: MobileAppStartsResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

const fetchAppStarts: MobilePanelRequest<MobileAppStartsResponse> = (apiClient, options) =>
  apiClient.fetch(
    'GET /internal/digital_experience/mobile_applications/{serviceName}/app_starts',
    options
  );

/** A mobile application's cold and warm starts over time, over the URL's filters and range. */
export const useMobileAppStarts = (serviceName: string): MobileAppStartsState => {
  const { response, ...state } = useMobilePanelData(fetchAppStarts, serviceName);
  return { appStarts: response, ...state };
};
