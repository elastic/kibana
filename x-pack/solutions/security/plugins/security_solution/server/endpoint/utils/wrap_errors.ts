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
export const wrapErrorIfNeeded = <E extends EndpointError = EndpointError>(error: Error): E => {
  if (error instanceof EndpointError) {
    return error as E;
  }

  // Check for known "Not Found" errors and wrap them with our own `NotFoundError`, which will enable
  // the correct HTTP status code to be used if it is thrown during processing of an API route
  if (
    error instanceof AgentNotFoundError ||
    error instanceof AgentPolicyNotFoundError ||
    error instanceof PackagePolicyNotFoundError
  ) {
    return new NotFoundError(error.message, error) as E;
  }

  return new EndpointError(error.message, error) as E;
};

/**
 * used as the callback to `Promise#catch()` to ensure errors
 * (especially those from kibana/elasticsearch clients) are wrapped
 *
 * @param error
 */
export const catchAndWrapError = <E extends Error>(error: E) =>
  Promise.reject(wrapErrorIfNeeded(error));
