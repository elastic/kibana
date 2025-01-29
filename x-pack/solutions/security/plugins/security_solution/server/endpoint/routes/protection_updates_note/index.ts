/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { getProtectionUpdatesNoteHandler, postProtectionUpdatesNoteHandler } from './handlers';
import {
  GetProtectionUpdatesNoteSchema,
  CreateUpdateProtectionUpdatesNoteSchema,
} from '../../../../common/api/endpoint/protection_updates_note';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { PROTECTION_UPDATES_NOTE_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointAppContext } from '../../types';

export function registerProtectionUpdatesNoteRoutes(
  router: IRouter,
  endpointAppContext: EndpointAppContext
) {
  const logger = endpointAppContext.logFactory.get('protectionUpdatesNote');

  router.versioned
    .post({
      access: 'public',
      path: PROTECTION_UPDATES_NOTE_ROUTE,
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
          request: CreateUpdateProtectionUpdatesNoteSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWritePolicyManagement'] },
        logger,
        postProtectionUpdatesNoteHandler()
      )
    );

  router.versioned
    .get({
      access: 'public',
      path: PROTECTION_UPDATES_NOTE_ROUTE,
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
          request: GetProtectionUpdatesNoteSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadPolicyManagement'] },
        logger,
        getProtectionUpdatesNoteHandler()
      )
    );
}
