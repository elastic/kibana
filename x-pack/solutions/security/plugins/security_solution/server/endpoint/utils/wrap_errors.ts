/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import {
  AgentPolicyNotFoundError,
  PackagePolicyNotFoundError,
} from '@kbn/fleet-plugin/server/errors';
import { NotFoundError } from '../errors';
import { EndpointError } from '../../../common/endpoint/errors';

/**
 * Will wrap the given Error with `EndpointError`, which will help getting a good picture of where in
 * our code the error originated (better stack trace).
 */
export const wrapErrorIfNeeded = <E extends EndpointError = EndpointError>(
  error: Error,
  messagePrefix?: string
): E => {
  if (error instanceof EndpointError) {
    return error as E;
  }

  const message = `${messagePrefix ? `${messagePrefix}: ` : ''}${error.message}`;

  // Check for known "Not Found" errors and wrap them with our own `NotFoundError`, which will enable
  // the correct HTTP status code to be used if it is thrown during processing of an API route
  if (
    error instanceof AgentNotFoundError ||
    error instanceof AgentPolicyNotFoundError ||
    error instanceof PackagePolicyNotFoundError
  ) {
    return new NotFoundError(message, error) as E;
  }

  return new EndpointError(message, error) as E;
};

interface CatchAndWrapError {
  (error: Error): Promise<never>;
  /** Use a custom error message prefix when wrapping the error */
  withMessage(message: string): (error: Error) => Promise<never>;
}

/**
 * used as the callback to `Promise#catch()` to ensure errors
 * (especially those from kibana/elasticsearch clients) are wrapped
 *
 * @param error
 */
export const catchAndWrapError: CatchAndWrapError = <E extends Error>(error: E) =>
  Promise.reject(wrapErrorIfNeeded(error));

catchAndWrapError.withMessage = (message) => {
  return (err: Error) => Promise.reject(wrapErrorIfNeeded(err, message));
};
