/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  GetMetadataListRequestSchema,
  GetMetadataRequestSchema,
} from '../../../../common/api/endpoint';
import { HostStatus } from '../../../../common/endpoint/types';
import type { EndpointAppContext } from '../../types';
import {
  getLogger,
  getMetadataRequestHandler,
  getMetadataListRequestHandler,
  getMetadataTransformStatsHandler,
} from './handlers';
import type { SecuritySolutionPluginRouter } from '../../../types';
import {
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  METADATA_TRANSFORMS_STATUS_INTERNAL_ROUTE,
} from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';

/* Filters that can be applied to the endpoint fetch route */
export const endpointFilters = schema.object({
  kql: schema.nullable(schema.string()),
  host_status: schema.nullable(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(HostStatus.HEALTHY.toString()),
        schema.literal(HostStatus.OFFLINE.toString()),
        schema.literal(HostStatus.UPDATING.toString()),
        schema.literal(HostStatus.UNHEALTHY.toString()),
        schema.literal(HostStatus.INACTIVE.toString()),
      ])
    )
  ),
});

export function registerEndpointRoutes(
  router: SecuritySolutionPluginRouter,
  endpointAppContext: EndpointAppContext
) {
  const logger = getLogger(endpointAppContext);

  router.versioned
    .get({
      access: 'public',
      path: HOST_METADATA_LIST_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: GetMetadataListRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        logger,
        getMetadataListRequestHandler(endpointAppContext, logger)
      )
    );

  router.versioned
    .get({
      access: 'public',
      path: HOST_METADATA_GET_ROUTE,
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        security: {
          authz: {
            requiredPrivileges: ['securitySolution'],
          },
        },
        validate: {
          request: GetMetadataRequestSchema,
        },
      },
      withEndpointAuthz(
        { any: ['canReadSecuritySolution', 'canAccessFleet'] },
        logger,
        getMetadataRequestHandler(endpointAppContext, logger)
      )
    );

  router.versioned
    .get({
      access: 'internal',
      path: METADATA_TRANSFORMS_STATUS_INTERNAL_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        logger,
        getMetadataTransformStatsHandler(endpointAppContext, logger)
      )
    );
}
