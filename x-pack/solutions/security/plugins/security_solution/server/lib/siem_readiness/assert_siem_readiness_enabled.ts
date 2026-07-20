/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaResponseFactory } from '@kbn/core/server';
import { ENABLE_SIEM_READINESS_SETTING } from '../../../common/constants';

/**
 * Returns a 403 response when the SIEM Readiness Advanced Setting is disabled.
 * Returns undefined when the feature is enabled so the route handler can proceed.
 */
export const assertSiemReadinessEnabled = async (
  uiSettingsClient: IUiSettingsClient,
  response: KibanaResponseFactory
) => {
  const isEnabled = await uiSettingsClient.get<boolean>(ENABLE_SIEM_READINESS_SETTING);

  if (!isEnabled) {
    return response.forbidden({
      body: `${ENABLE_SIEM_READINESS_SETTING} feature must be activated first`,
    });
  }

  return undefined;
};
