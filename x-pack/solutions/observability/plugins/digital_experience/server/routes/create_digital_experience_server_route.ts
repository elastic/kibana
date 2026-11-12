/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository-utils';
import type { ApmDataAccessPluginSetup } from '@kbn/apm-data-access-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SessionsSettings } from '../../common/sessions';
import { describeError, toClientError } from '../lib/helpers/errors';

/** What sessions need from other plugins, available once they have started. */
export interface SessionsServices {
  /** Runs the summaries task; without it, sessions can't be enabled. */
  taskManager: TaskManagerStartContract | undefined;
  /** Whether Kibana can store the task's API key, which needs an encryption key. */
  canEncrypt: boolean;
}

export interface DigitalExperienceRouteHandlerResources extends DefaultRouteHandlerResources {
  /** Optional: only the Classic source needs it. */
  plugins: { apmDataAccess?: ApmDataAccessPluginSetup };
  isServerless: boolean;
  /** Whether the ux plugin is enabled; the Classic RUM source needs it, like the browser does. */
  isUxEnabled: boolean;
  /** `xpack.digital_experience.sessions` of kibana.yml: the summaries task's default settings. */
  sessionsSettingsDefaults: SessionsSettings;
  /** The settings the summaries task runs with: the ones saved in the app over kibana.yml's. */
  getSessionsSettings: () => Promise<SessionsSettings>;
  getSessionsServices: () => Promise<SessionsServices>;
}

const createServerRoute = createServerRouteFactory<
  DigitalExperienceRouteHandlerResources,
  undefined
>();

/** Creates a route whose errors are logged and answered without the Elasticsearch details. */
export const createDigitalExperienceServerRoute: typeof createServerRoute = ({
  handler,
  ...route
}) =>
  createServerRoute({
    ...route,
    handler: async (resources) => {
      try {
        return await handler(resources);
      } catch (error) {
        const clientError = toClientError(error);
        if (clientError !== error) {
          resources.logger.error(`${route.endpoint} failed: ${describeError(error)}`);
        }
        throw clientError;
      }
    },
  });
