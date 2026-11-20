/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, notFound } from '@hapi/boom';
import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { EntityInventoryRouteHandlerResources } from './types';

const INVENTORY_ERROR_NAMES: ReadonlySet<string> = new Set([
  'InventoryTypeNotFoundError',
  'InventoryRequestError',
  'InventoryTypeDefinitionError',
]);

const createPlainEntityInventoryServerRoute =
  createServerRouteFactory<EntityInventoryRouteHandlerResources>();

/**
 * Throws a Boom 404 for `InventoryTypeNotFoundError` and a Boom 400 for `InventoryRequestError` and
 * `InventoryTypeDefinitionError`, carrying only the error message. Rethrows any other error unchanged.
 */
const throwAsHttpError = (error: {
  name?: string;
  statusCode?: number;
  message?: string;
}): never => {
  if (error && INVENTORY_ERROR_NAMES.has(error.name ?? '')) {
    switch (error.statusCode) {
      case 400:
        throw badRequest(error.message);
      case 404:
        throw notFound(error.message);
    }
  }
  throw error;
};

export const createEntityInventoryServerRoute: typeof createPlainEntityInventoryServerRoute = ({
  handler,
  ...config
}) =>
  createPlainEntityInventoryServerRoute({
    ...config,
    handler: (options) => handler(options).catch(throwAsHttpError),
  });
