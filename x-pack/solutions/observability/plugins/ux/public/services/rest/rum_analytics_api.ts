/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { RumAnalyticsStatus } from '../../../common/rum_sessions';

export const fetchRumAnalyticsStatus = async ({
  http,
}: {
  http: HttpStart;
}): Promise<RumAnalyticsStatus> => {
  return http.get<RumAnalyticsStatus>('/internal/ux/rum/analytics_status');
};

export const installRumSessionsTransform = async ({
  http,
}: {
  http: HttpStart;
}): Promise<RumAnalyticsStatus> => {
  return http.post<RumAnalyticsStatus>('/internal/ux/rum/analytics_status/_install');
};
