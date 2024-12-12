/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import {
  RouteValidationError,
  RouteValidationFunction,
  RouteValidationResultFactory,
} from '@kbn/core/server';

type RequestValidationResult<T> =
  | {
      value: T;
      error?: undefined;
    }
  | {
      value?: undefined;
      error: RouteValidationError;
    };

/**
 * Copied from x-pack/plugins/security_solution/server/utils/build_validation/route_validation.ts
 * This really should be in @kbn/securitysolution-io-ts-utils rather than copied yet again, however, this has types
 * from a lot of places such as RouteValidationResultFactory from core/server which in turn can pull in @kbn/schema
 * which cannot work on the front end and @kbn/securitysolution-io-ts-utils works on both front and backend.
 *
 * TODO: Figure out a way to move this function into a package rather than copying it/forking it within plugins
 */
export const buildRouteValidation =
  <T extends rt.Mixed, A = rt.TypeOf<T>>(schema: T): RouteValidationFunction<A> =>
  (
    inputValue: unknown,
    validationResult: RouteValidationResultFactory
  ): RequestValidationResult<A> =>
    pipe(
      schema.decode(inputValue),
      (decoded) => exactCheck(inputValue, decoded),
      fold<rt.Errors, A, RequestValidationResult<A>>(
        (errors: rt.Errors) => validationResult.badRequest(formatErrors(errors).join()),
        (validatedInput: A) => validationResult.ok(validatedInput)
      )
    );
