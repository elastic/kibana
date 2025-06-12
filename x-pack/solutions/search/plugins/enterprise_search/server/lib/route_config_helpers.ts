/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  DestructiveRouteMethod,
  RouteConfig,
  RouteConfigOptions,
  RouteMethod,
  RouteValidatorFullConfigRequest,
} from '@kbn/core/server';

type Config<Method extends DestructiveRouteMethod> = RouteConfig<unknown, unknown, unknown, Method>;

// We disallow options to set 'body' because we override them.
interface ConfigWithoutBodyOptions<P, Q, B, Method extends RouteMethod>
  extends RouteConfig<P, Q, B, Method> {
  validate: Omit<RouteValidatorFullConfigRequest<P, Q, B>, 'body'>;
  options?: Omit<RouteConfigOptions<Method>, 'body'>;
}

/**
 * Kibana Enterprise Search Plugin API endpoints often times pass through the request
 * body to the Enterprise Search API endpoints for validation. In those cases, we do not
 * need to validate them in Kibana.
 *
 * The safe way to do that is to turn off body parsing entirely using `options.body.parse: false`.
 * The will pass a String Buffer to the route handler. The proper way to validate this when validation
 * is enabled to to use `body: schema.buffer()`.
 *
 * @see https://github.com/elastic/kibana/blob/8.0/docs/development/core/server/kibana-plugin-core-server.routeconfigoptionsbody.md
 * @see https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-config-schema/README.md#schemabuffer
 *
 * Example:
 *  router.put({
 *    path: '/internal/app_search/engines/{engineName}/example',
 *    validate: {
 *      params: schema.object({
 *        engineName: schema.string(),
 *      }),
 *      body: schema.buffer(),
 *    },
 *    options: { body: { parse: false } },
 *  },
 *  ...
 *
 * This helper applies that pattern, while maintaining existing options:
 *
 *  router.put(skipBodyValidation({
 *    path: '/internal/app_search/engines/{engineName}/example',
 *    validate: {
 *      params: schema.object({
 *        engineName: schema.string(),
 *      }),
 *    },
 *  },
 *  ...
 */
export const skipBodyValidation = <Method extends DestructiveRouteMethod>(
  // DestructiveRouteMethod is the Kibana type for everything except 'get' and 'options'.
  // Body configuration doesn't apply to those types so we disallow it with this helper.
  config: ConfigWithoutBodyOptions<unknown, unknown, unknown, Method>
): Config<Method> => {
  return {
    ...config,
    validate: {
      ...config.validate,
      body: schema.buffer(),
    },
    options: {
      ...(config.options || {}),
      body: {
        parse: false,
      } as RouteConfigOptions<Method>['body'],
    },
  };
};
