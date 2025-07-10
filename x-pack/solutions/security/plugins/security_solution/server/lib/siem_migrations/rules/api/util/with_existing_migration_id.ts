/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, RouteMethod } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';

export const MIGRATION_ID_NOT_FOUND = (id: string) =>
  i18n.translate('xpack.securitySolution.api.migrationIdNotFound', {
    defaultMessage: `No Migration found with id: {id}`,
    values: {
      id,
    },
  });

/**
 * Checks the existence of a valid migration before proceeding with the request.
 *
 * if not found, it returns a 404 error with a message.
 * if found, it adds the migration to the context.
 *
 * */
export const withExistingMigration = <
  P extends { migration_id: string },
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = never
>(
  handler: RequestHandler<P, Q, B, SecuritySolutionRequestHandlerContext, Method>
): RequestHandler<P, Q, B, SecuritySolutionRequestHandlerContext, Method> => {
  return async (context, req, res) => {
    const { migration_id: migrationId } = req.params;
    const ctx = await context.resolve(['securitySolution']);
    const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
    const storedMigration = await ruleMigrationsClient.data.migrations.get({
      id: migrationId,
    });

    if (!storedMigration) {
      return res.notFound({
        body: MIGRATION_ID_NOT_FOUND(migrationId),
      });
    }

    return handler(context, req, res);
  };
};
