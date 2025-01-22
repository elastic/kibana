/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boom, badRequest, conflict, forbidden, notFound } from '@hapi/boom';
import { SLOError, SecurityException, SLOIdConflict, SLONotFound } from './errors';

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

export async function executeWithErrorHandler(fn: () => Promise<any>): Promise<any> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof SLOError) {
      throw handleSLOError(error);
    }

    throw error;
  }
}
