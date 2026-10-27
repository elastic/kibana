/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { registerSyntheticsTLSCheckRule } from './alert_rules/tls_rule/tls_rule';
import { registerSyntheticsStatusCheckRule } from './alert_rules/status_rule/monitor_status_rule';
import type { SyntheticsPluginsSetupDependencies, SyntheticsServerSetup } from './types';
import { createSyntheticsRouteWithAuth } from './routes/create_route_with_auth';
import type { SyntheticsMonitorClient } from './synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { syntheticsRouteWrapper } from './synthetics_route_wrapper';
import { syntheticsAppPublicRestApiRoutes, syntheticsAppRestApiRoutes } from './routes';
export const initSyntheticsServer = (
  server: SyntheticsServerSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  plugins: SyntheticsPluginsSetupDependencies,
  ruleDataClient: IRuleDataClient
) => {
  const { router } = server;
  syntheticsAppRestApiRoutes.forEach((route) => {
    const { method, options, handler, validate, path, security } = syntheticsRouteWrapper(
      createSyntheticsRouteWithAuth(route),
      server,
      syntheticsMonitorClient
    );

    const routeDefinition = {
      path,
      validate,
      security,
      options,
    };

    switch (method) {
      case 'GET':
        router.get(routeDefinition, handler);
        break;
      case 'POST':
        router.post(routeDefinition, handler);
        break;
      case 'PUT':
        router.put(routeDefinition, handler);
        break;
      case 'DELETE':
        router.delete(routeDefinition, handler);
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  });

  syntheticsAppPublicRestApiRoutes.forEach((route) => {
    const { method, options, handler, path, validation, security } = syntheticsRouteWrapper(
      createSyntheticsRouteWithAuth(route),
      server,
      syntheticsMonitorClient
    );

    const { summary, description, operationId, oasOperationObject, ...routeOptions } =
      options ?? {};
    const tags = [...(routeOptions.tags ?? []), 'oas-tag:synthetics'];
    const routeConfig = {
      access: 'public' as const,
      path,
      security,
      summary,
      description,
      operationId,
    };
    const getVersionedRouteOptions = {
      availability: routeOptions.availability,
      excludeFromOAS: routeOptions.excludeFromOAS,
      excludeFromRateLimiter: routeOptions.excludeFromRateLimiter,
      httpResource: routeOptions.httpResource,
      httpResponseLogLevel: routeOptions.httpResponseLogLevel,
      tags,
      timeout: routeOptions.timeout && { idleSocket: routeOptions.timeout.idleSocket },
    };
    const versionConfig = {
      version: '2023-10-31' as const,
      validate: validation ?? (false as const),
      options: { oasOperationObject },
    };

    switch (method) {
      case 'GET':
        router.versioned
          .get({ ...routeConfig, options: getVersionedRouteOptions })
          .addVersion(versionConfig, handler);
        break;
      case 'PUT':
        router.versioned
          .put({ ...routeConfig, options: { ...routeOptions, tags } })
          .addVersion(versionConfig, handler);
        break;
      case 'POST':
        router.versioned
          .post({ ...routeConfig, options: { ...routeOptions, tags } })
          .addVersion(versionConfig, handler);
        break;
      case 'DELETE':
        router.versioned
          .delete({ ...routeConfig, options: { ...routeOptions, tags } })
          .addVersion(versionConfig, handler);
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  });

  registerSyntheticsStatusCheckRule(server, plugins, syntheticsMonitorClient);
  registerSyntheticsTLSCheckRule(server, plugins, syntheticsMonitorClient);
};
