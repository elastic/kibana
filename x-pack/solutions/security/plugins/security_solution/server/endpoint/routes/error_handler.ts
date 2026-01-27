/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { FleetFileNotFound } from '@kbn/fleet-plugin/server/errors';
import { CustomHttpRequestError } from '../../utils/custom_http_request_error';
import { EndpointAuthorizationError, EndpointHttpError, NotFoundError } from '../errors';
import { EndpointHostUnEnrolledError, EndpointHostNotFoundError } from '../services/metadata';

/**
 * Default Endpoint Routes error handler
 * @param logger
 * @param res
 * @param error
 */
export const errorHandler = <E extends Error>(
  logger: Logger,
  res: KibanaResponseFactory,
  error: E
): IKibanaResponse => {
  const shouldLogToDebug = () => {
    return error instanceof EndpointHostNotFoundError;
  };

  if (shouldLogToDebug()) {
    logger.debug(error.message);
  } else {
    logger.error(error);
  }

  if (error instanceof CustomHttpRequestError || error instanceof EndpointHttpError) {
    return res.customError({
      statusCode: error.statusCode,
      body: error,
    });
  }

  if (error instanceof NotFoundError || error instanceof FleetFileNotFound) {
    return res.notFound({ body: error });
  }

  if (error instanceof EndpointHostUnEnrolledError) {
    return res.badRequest({ body: error });
  }

  if (error instanceof EndpointHostNotFoundError) {
    return res.notFound({ body: error });
  }

  if (error instanceof EndpointAuthorizationError) {
    return res.forbidden({ body: error });
  }

  // Kibana core server handling of `500` errors does not actually return the `error.message` encountered,
  // which can be critical in understanding what the root cause of a problem might be, so we handle
  // `500` here to ensure that the `error.message` is returned
  return res.customError({
    statusCode: 500,
    body: error,
  });
};
