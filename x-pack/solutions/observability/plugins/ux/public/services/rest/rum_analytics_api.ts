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

/** Sets up what ux owns for analytics: the OTel session sort and the daily rollups. */
export const installRumRollups = async ({
  http,
}: {
  http: HttpStart;
}): Promise<RumAnalyticsStatus> => {
  return http.post<RumAnalyticsStatus>('/internal/ux/rum/analytics_status/_install');
};

/** The part of the digitalExperience sessions status that ux shows. */
export interface DigitalExperienceSessionsStatus {
  installed: boolean;
  /** True when a user with the manage sessions privilege must enable sessions again. */
  needsUpdate: boolean;
  reason: string | null;
}

/**
 * The sessions transforms belong to the digitalExperience plugin. Both calls need its privileges,
 * which users of ux alone may lack.
 */
export const fetchDigitalExperienceSessionsStatus = async ({
  http,
}: {
  http: HttpStart;
}): Promise<DigitalExperienceSessionsStatus> => {
  return http.get<DigitalExperienceSessionsStatus>('/internal/digital_experience/sessions/status');
};

export const enableDigitalExperienceSessions = async ({
  http,
}: {
  http: HttpStart;
}): Promise<DigitalExperienceSessionsStatus> => {
  return http.post<DigitalExperienceSessionsStatus>('/internal/digital_experience/sessions/enable');
};
