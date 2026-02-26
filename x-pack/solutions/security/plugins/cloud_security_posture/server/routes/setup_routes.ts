/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Logger } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';

import {
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
  CLOUD_SECURITY_INTERTAL_PREFIX_ROUTE_PATH,
} from '../../common/constants';
import type {
  CspRequestHandlerContext,
  CspServerPluginStart,
  CspServerPluginStartDeps,
} from '../types';
import { PLUGIN_ID } from '../../common';
import { defineGetComplianceDashboardRoute } from './compliance_dashboard/compliance_dashboard';
import { defineGetVulnerabilitiesDashboardRoute } from './vulnerabilities_dashboard/vulnerabilities_dashboard';
import { defineGetBenchmarksRoute } from './benchmarks/benchmarks';
import { defineGetCspStatusRoute } from './status/status';
import { defineFindCspBenchmarkRuleRoute } from './benchmark_rules/find/find';
import { defineGetDetectionEngineAlertsStatus } from './detection_engine/get_detection_engine_alerts_count_by_rule_tags';
import { defineBulkActionCspBenchmarkRulesRoute } from './benchmark_rules/bulk_action/bulk_action';
import { defineGetCspBenchmarkRulesStatesRoute } from './benchmark_rules/get_states/get_states';
import { setupCdrDataViews } from '../saved_objects/data_views';
import { defineGraphRoute } from './graph/route';

/**
 * 1. Registers routes
 * 2. Registers routes handler context
 */
export function setupRoutes({
  core,
  logger,
  isPluginInitialized,
}: {
  core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>;
  logger: Logger;
  isPluginInitialized(): boolean;
}) {
  const router = core.http.createRouter<CspRequestHandlerContext>();
  defineGetComplianceDashboardRoute(router);
  defineGetVulnerabilitiesDashboardRoute(router);
  defineGetBenchmarksRoute(router);
  defineGetCspStatusRoute(router);
  defineFindCspBenchmarkRuleRoute(router);
  defineGetDetectionEngineAlertsStatus(router);
  defineBulkActionCspBenchmarkRulesRoute(router);
  defineGetCspBenchmarkRulesStatesRoute(router);
  defineGraphRoute(router);

  core.http.registerOnPostAuth(async (request, response, toolkit) => {
    if (request.url.pathname.includes(CLOUD_SECURITY_INTERTAL_PREFIX_ROUTE_PATH)) {
      try {
        const [coreStart, startDeps] = await core.getStartServices();
        const esClient = coreStart.elasticsearch.client.asInternalUser;
        const soClient = coreStart.savedObjects.createInternalRepository();
        const spaces = startDeps.spaces?.spacesService;
        const dataViews = startDeps.dataViews;
        await setupCdrDataViews(esClient, soClient, spaces, dataViews, request, logger);
      } catch (err) {
        logger.error(`Failed to create CDR data views: ${err}`);
      }
    }
    return toolkit.next();
  });

  core.http.registerRouteHandlerContext<CspRequestHandlerContext, typeof PLUGIN_ID>(
    PLUGIN_ID,
    async (context, request) => {
      const [, { security, fleet, spaces }] = await core.getStartServices();
      const coreContext = await context.core;
      await fleet.fleetSetupCompleted();

      let user: AuthenticatedUser | null = null;

      return {
        get user() {
          // We want to call getCurrentUser only when needed and only once
          if (!user) {
            user = security.authc.getCurrentUser(request);
          }
          return user;
        },
        logger,
        esClient: coreContext.elasticsearch.client,
        soClient: coreContext.savedObjects.client,
        spacesService: spaces?.spacesService,
        encryptedSavedObjects: coreContext.savedObjects.getClient({
          includedHiddenTypes: [INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE],
        }),
        agentPolicyService: fleet.agentPolicyService,
        agentService: fleet.agentService,
        packagePolicyService: fleet.packagePolicyService,
        packageService: fleet.packageService,
        isPluginInitialized,
      };
    }
  );
}
