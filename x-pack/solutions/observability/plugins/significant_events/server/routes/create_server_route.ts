/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import { badRequest, conflict, forbidden, internal, isBoom, notFound } from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import {
  NightshiftModelBlockedError,
  NightshiftModelNotFoundError,
} from '@kbn/significant-events-schema';
import {
  isNightshiftSpaceGatedEndpoint,
  isNightshiftSupportedSpace,
  NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE,
} from '@kbn/nightshift-shared';
import type { SignificantEventsRouteHandlerResources } from './types';
import type { StatusError } from '../lib/errors/status_error';

// Errors can come from other plugins with their own StatusError class, so match status
// errors by shape, not by class.
const isStatusErrorLike = (error: unknown): error is StatusError =>
  error instanceof Error &&
  !(error instanceof errors.ResponseError) &&
  !isBoom(error) &&
  'statusCode' in error &&
  typeof error.statusCode === 'number';

/**
 * The writes that stay reachable outside the default space, so a space set up on an earlier build
 * can be taken back down: pausing maintenance stops the work it was left with, and the reset
 * deletes what it was left with.
 */
const SPACE_GATE_EXEMPT_ENDPOINTS: ReadonlySet<string> = new Set([
  'POST /internal/significant_events/maintenance/_pause',
  'POST /internal/significant_events/maintenance/_reset',
]);

const createPlainSignificantEventsServerRoute =
  createServerRouteFactory<SignificantEventsRouteHandlerResources>();

export const createServerRoute: CreateServerRouteFactory<
  SignificantEventsRouteHandlerResources,
  undefined
> = ({ handler, ...config }) => {
  // Applied here rather than route by route, so a new write route is gated by default: these
  // routes install enabled workflows and write per-space state, and Nightshift only runs in the
  // default space. Reads stay open everywhere.
  const gated = isNightshiftSpaceGatedEndpoint(config.endpoint, SPACE_GATE_EXEMPT_ENDPOINTS);

  return createPlainSignificantEventsServerRoute({
    ...config,
    options: {
      ...config.options,
      tags: [...(config.options?.tags ?? []), 'oas-tag:significant_events'],
    },
    // Async, so the refusal below surfaces as a rejected promise like any other route error.
    handler: async (options) => {
      if (gated && !isNightshiftSupportedSpace(options.request.spaceId)) {
        throw badRequest(NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE);
      }
      return handler(options).catch((error) => {
        if (
          error instanceof NightshiftModelNotFoundError ||
          error instanceof NightshiftModelBlockedError
        ) {
          throw badRequest(error.message);
        }

        if (isStatusErrorLike(error)) {
          switch (error.statusCode) {
            case 400:
              throw badRequest(error.message);
            case 403:
              throw forbidden(error.message);
            case 404:
              throw notFound(error.message);
            case 409:
              throw conflict(error.message, error.data);
            default:
              throw internal(error.message);
          }
        }

        if (error instanceof errors.ResponseError) {
          switch (error.statusCode) {
            case 400:
              throw badRequest(error, 'data' in error ? error.data : undefined);

            case 403:
              throw forbidden(error, 'data' in error ? error.data : undefined);

            case 404:
              throw notFound(error, 'data' in error ? error.data : undefined);

            case 409:
              throw conflict(error, 'data' in error ? error.data : undefined);

            case 500:
              throw internal(error, 'data' in error ? error.data : undefined);
          }
        }
        throw error;
      });
    },
  });
};
