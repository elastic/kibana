/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { PrivMonHealthResponse } from '../../../common/api/entity_analytics/privilege_monitoring/health.gen';
import { API_VERSIONS } from '../../../common/constants';

const HIDE_TIMELINE_HEALTH_STATUS = ['error', 'not_found'];

/**
 * Function to determine if the timeline should be displayed for Privileged User Monitoring page.
 * It checks the health status of the Privileged Monitoring Engine.
 * If the engine is not available the timeline should be hidden.
 */
export const isPrivMonTimelineEnabled = async (http: HttpSetup) => {
  const response = await http.get<PrivMonHealthResponse>(
    '/api/entity_analytics/monitoring/privileges/health',
    { version: API_VERSIONS.public.v1 }
  );

  return HIDE_TIMELINE_HEALTH_STATUS.includes(response.status);
};
