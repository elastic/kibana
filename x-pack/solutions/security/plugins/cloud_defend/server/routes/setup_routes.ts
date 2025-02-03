/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, CoreSetup, Logger } from '@kbn/core/server';
import type {
  CloudDefendRequestHandlerContext,
  CloudDefendPluginStart,
  CloudDefendPluginStartDeps,
} from '../types';
import { PLUGIN_ID } from '../../common/constants';
import { defineGetPoliciesRoute } from './policies/policies';
import { defineGetCloudDefendStatusRoute } from './status/status';

/**
 * 1. Registers routes
 * 2. Registers routes handler context
 */
export function setupRoutes({
  core,
  logger,
}: {
  core: CoreSetup<CloudDefendPluginStartDeps, CloudDefendPluginStart>;
  logger: Logger;
}) {
  const router = core.http.createRouter<CloudDefendRequestHandlerContext>();
  defineGetPoliciesRoute(router);
  defineGetCloudDefendStatusRoute(router);

  core.http.registerRouteHandlerContext<CloudDefendRequestHandlerContext, typeof PLUGIN_ID>(
    PLUGIN_ID,
    async (context, _request) => {
      const [_, { fleet }] = await core.getStartServices();
      const coreContext = await context.core;
      await fleet.fleetSetupCompleted();

      let user: AuthenticatedUser | null = null;

      return {
        get user() {
          // We want to call getCurrentUser only when needed and only once
          if (!user) {
            user = coreContext.security.authc.getCurrentUser();
          }
          return user;
        },
        logger,
        esClient: coreContext.elasticsearch.client,
        soClient: coreContext.savedObjects.client,
        agentPolicyService: fleet.agentPolicyService,
        agentService: fleet.agentService,
        packagePolicyService: fleet.packagePolicyService,
        packageService: fleet.packageService,
      };
    }
  );
}
