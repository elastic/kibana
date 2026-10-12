/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  RouteSecurity,
  StartServicesAccessor,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { APP_ID } from '../../../../../common';
import type { StartPlugins } from '../../../../plugin';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';
import type { BriefStore } from '../store/brief_store';
import type { BriefOwner } from '../store/owner_id';
import { getBriefOwner } from '../store/owner_id';

export interface ExecutiveBriefRouteDeps {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
  getStartServices: StartServicesAccessor<StartPlugins>;
  getBriefStore: () => Promise<BriefStore>;
  /** `encryptedSavedObjects.canEncrypt`; Task Manager needs it to store the user's API key. */
  hasEncryptionKey: boolean;
}

export const EXECUTIVE_BRIEF_ROUTE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
  },
};

/** Error codes returned in `attributes.code`, so the UI can explain what to do. */
export type BriefRouteErrorCode =
  | 'no_encryption_key'
  | 'no_stable_user'
  | 'no_connector'
  | 'too_many_running'
  | 'conflict'
  | 'not_found'
  | 'internal';

export const briefErrorResponse = (
  response: KibanaResponseFactory,
  statusCode: number,
  code: BriefRouteErrorCode,
  message: string
): IKibanaResponse => response.customError({ statusCode, body: { message, attributes: { code } } });

/** The stable owner of the request, or undefined when the user has no stable id. */
export const getRequestOwner = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest
): Promise<BriefOwner | undefined> => {
  const coreContext = await context.core;
  return getBriefOwner({
    authUser: coreContext.security.authc.getCurrentUser(),
    request,
    esClient: coreContext.elasticsearch.client.asCurrentUser,
  });
};

export const noStableUserResponse = (response: KibanaResponseFactory): IKibanaResponse =>
  briefErrorResponse(
    response,
    400,
    'no_stable_user',
    'Executive briefs need a user with a stable identity (a user profile or realm user).'
  );

export const internalErrorResponse = (
  response: KibanaResponseFactory,
  logger: Logger,
  error: Error,
  action: string
): IKibanaResponse => {
  const { statusCode, message } = transformError(error);
  logger.error(`Executive brief: failed to ${action}: ${message}`);
  return briefErrorResponse(response, statusCode, 'internal', message);
};
