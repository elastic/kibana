/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository-utils';
import type { ApmDataAccessPluginSetup } from '@kbn/apm-data-access-plugin/server';
import type { SessionsSettings } from '../../common/sessions';

export interface DigitalExperienceRouteHandlerResources extends DefaultRouteHandlerResources {
  /** Optional: only the Classic source needs it. */
  plugins: { apmDataAccess?: ApmDataAccessPluginSetup };
  isServerless: boolean;
  /** Whether the ux plugin is enabled; the Classic RUM source needs it, like the browser does. */
  isUxEnabled: boolean;
  /** `xpack.digitalExperience.sessions` config: the transforms' frequency and partitions. */
  sessionsSettings: SessionsSettings;
}

export const createDigitalExperienceServerRoute = createServerRouteFactory<
  DigitalExperienceRouteHandlerResources,
  undefined
>();
