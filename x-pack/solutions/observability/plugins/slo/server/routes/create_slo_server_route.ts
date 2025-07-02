/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createServerRouteFactory } from '@kbn/server-route-repository';
import { Boom, forbidden, notFound, conflict, badRequest } from '@hapi/boom';
import { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import { SLORouteHandlerResources } from './types';
import { SLOError, SLONotFound, SLOIdConflict, SecurityException } from '../errors';

function handleSLOError(error: SLOError): Boom {
  if (error instanceof SLONotFound) {
    return notFound(error.message);
  }

  if (error instanceof SLOIdConflict) {
    return conflict(error.message);
  }

  if (error instanceof SecurityException) {
    return forbidden(error.message);
  }

  return badRequest(error.message);
}

const createPlainSloServerRoute = createServerRouteFactory<SLORouteHandlerResources>();

export const createSloServerRoute: CreateServerRouteFactory<
  SLORouteHandlerResources,
  undefined
> = ({ handler, ...config }) => {
  return createPlainSloServerRoute({
    ...config,
    handler: (options) => {
      return handler(options).catch((error) => {
        if (error instanceof SLOError) {
          throw handleSLOError(error);
        }
        throw error;
      });
    },
  });
};
