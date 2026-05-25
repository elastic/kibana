/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import {
  AgentPolicyNotFoundError,
  PackagePolicyNotFoundError,
} from '@kbn/fleet-plugin/server/errors';
import { errors, type DiagnosticResult } from '@elastic/elasticsearch';
import { isPlainObject } from 'lodash';
import { EndpointError } from '../../../common/endpoint/errors';
import { NotFoundError } from '../errors';

/**
 * Will wrap the given Error with `EndpointError`, which will help getting a good picture of where in
 * our code the error originated (better stack trace). It will also process some known error types
 * and build a more descriptive error message and add additional `debug` details to the error object.
 */
export const wrapErrorIfNeeded = <E extends EndpointError = EndpointError>(
  error: Error,
  messagePrefix?: string
): E => {
  if (error instanceof EndpointError) {
    return error as E;
  }

  let debug: EndpointError['debug'];
  let message = `${messagePrefix ? `${messagePrefix}: ` : ''}${error.message}`;

  try {
    // Process known error Types and retrieve additional data not normally output to logs
    if (error instanceof errors.ElasticsearchClientError) {
      const esError = error as { meta?: DiagnosticResult; body?: any };

      debug = {
        es_request: {
          method: esError.meta?.meta?.request?.params?.method,
          path: esError.meta?.meta?.request?.params?.path,
          querystring: esError.meta?.meta?.request?.params?.querystring,
          body: esError.meta?.meta?.request?.params?.body,
        },
        es_response: {
          body: esError.body,
        },
      };

      // Since this is an elasticsearch client error, lets build a better error message
      // that is based on the Elasticsearch error response body

      const queue: any[] = [debug.es_response.body];
      let newMessage = '';

      // The most common Elasticsearch error response structure seems to be something like:
      // {
      //   error?: {
      //     type: string;           // e.g., 'index_not_found_exception'
      //     reason: string;         // Human-readable message
      //     caused_by?: {
      //       type?: string;
      //       reason?: string;
      //       caused_by?: { ... }   // Recursive chain
      //     };
      //     root_cause?: Array<{    // Array of root causes
      //       type?: string;
      //       reason?: string;
      //     }>;
      //   };
      //   status?: number;          // HTTP status code
      // }
      // So we'll loop through all this data and grab the string values for 'reason'
      while (queue.length > 0) {
        const record = queue.shift();

        if (Array.isArray(record)) {
          queue.push(...record);
        } else if (isPlainObject(record)) {
          Object.entries(record).forEach(([key, value]) => {
            if (isPlainObject(value) || Array.isArray(value)) {
              queue.push(value);
            } else if (key === 'reason') {
              newMessage += (newMessage.length > 0 ? ' > ' : '') + value;

              if (record.index) {
                newMessage += ` (index: ${record.index})`;
              }
            }
          });
        }
      }

      if (newMessage.length > 0) {
        message = `${
          messagePrefix ? `${messagePrefix}: ` : ''
        }Elasticsearch error encountered: ${newMessage}`;
      }
    }
  } catch (_) {
    /* best effort - failures are ignored */
  }

  // Check for known "Not Found" errors and wrap them with our own `NotFoundError`, which will enable
  // the correct HTTP status code to be used if it is thrown during processing of an API route
  if (
    error instanceof AgentNotFoundError ||
    error instanceof AgentPolicyNotFoundError ||
    error instanceof PackagePolicyNotFoundError
  ) {
    return new NotFoundError(message, error) as E;
  }

  const err = new EndpointError(message, error) as E;
  err.debug = debug;

  return err;
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
