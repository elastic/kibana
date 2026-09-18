/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteValidationFunction } from '@kbn/core-http-server';
import { z } from '@kbn/zod';
import { BooleanFromString } from '@kbn/zod-helpers';

export const MAX_ROUTE_ID_LENGTH = 1024;
export const MAX_ROUTE_STRING_LENGTH = 4096;
export const MAX_DATE_RANGE_LENGTH = 4096;
// Pre-existing product cap (project-monitor delete, overview trends, bulk reset).
export const MAX_MONITOR_BATCH_SIZE = 500;
// Public bulk id lists were unbounded; decrypt finder paginates past perPage 500.
export const MAX_MONITOR_BULK_SIZE = 10_000;
// Per-id SO fan-out (bulk update, health); temporary raise from the product 500.
export const MAX_MONITOR_FANOUT_SIZE = 1000;
// Param id lists are SO-only, so they can match the public bulk cap.
export const MAX_PARAM_BULK_SIZE = 10_000;
// Params hold PEM chains / keys; 10KB 400s those. 1MB is a DoS cap, not a product limit.
export const MAX_PARAM_VALUE_LENGTH = 1_000_000;

const blankQueryNumberToNaN = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? Number.NaN : value;

/**
 * config-schema `schema.number()` 400s blank query values (`?interval=`) and
 * integers outside `Number.MAX_SAFE_INTEGER`. `z.coerce.number()` alone turns
 * blanks into `0` and rounds unsafe ints.
 */
export const queryNumberFrom = (min?: number, max?: number) =>
  z.preprocess(
    blankQueryNumberToNaN,
    z.coerce
      .number()
      .min(min ?? Number.MIN_SAFE_INTEGER)
      .max(max ?? Number.MAX_SAFE_INTEGER)
  );

export const queryNumber = queryNumberFrom();

/** `schema.any()` equivalent. Field codecs run in-handler after name/url aliases. */
export const monitorRequestBody = z.any();
export const queryBoolean = z.preprocess(
  (value) => (typeof value === 'string' ? value.toLowerCase() : value),
  BooleanFromString
);
export const routeId = z.string().min(1).max(MAX_ROUTE_ID_LENGTH);
export const optionalRouteId = z.string().max(MAX_ROUTE_ID_LENGTH).optional();
export const optionalQueryString = z.string().max(MAX_ROUTE_STRING_LENGTH).optional();

/** Match config-schema `schema.string({ minLength })` 400 copy. */
export const minLengthMessage = (minLength: number) => (issue: { input?: unknown }) => {
  const length = String(issue.input ?? '').length;
  return `value has length [${length}] but it must have a minimum length of [${minLength}].`;
};

/** Match config-schema `schema.arrayOf(..., { maxSize })` 400 copy. */
export const maxArraySizeMessage = (maxSize: number) => (issue: { input?: unknown }) => {
  const size = Array.isArray(issue.input) ? issue.input.length : 0;
  return `array size is [${size}], but cannot be greater than [${maxSize}]`;
};

/**
 * config-schema `arrayOf` JSON-parses query strings (`spaces=["*"]`). Cap the
 * raw string to the largest valid JSON array for `maxSize` items of
 * `itemMaxLength` (plus quote/comma/whitespace slack) so a huge payload never
 * reaches `JSON.parse`, without rejecting in-contract lists.
 */
export const jsonArrayRawMaxLength = (itemMaxLength: number, maxSize: number): number =>
  maxSize * (itemMaxLength + 4) + 2;

export const jsonArrayFromString = <T extends z.ZodType>(
  item: T,
  maxSize: number,
  itemMaxLength: number = MAX_ROUTE_ID_LENGTH
) =>
  z.preprocess((value: unknown) => {
    if (typeof value !== 'string') {
      return value;
    }
    if (value.length > jsonArrayRawMaxLength(itemMaxLength, maxSize)) {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, z.array(item).max(maxSize));

/**
 * Pass the failing path into `badRequest` so core prefixes `[request body.x]:`
 * the way config-schema did. Raw `schema.parse()` otherwise 400s with Zod JSON.
 */
export const asRouteSchema = <T extends z.ZodType>(
  schema: T
): RouteValidationFunction<z.infer<T>> => {
  const fn: RouteValidationFunction<z.infer<T>> = (input, { ok, badRequest }) => {
    const result = schema.safeParse(input);
    if (result.success) {
      return ok(result.data);
    }
    const issue = result.error.issues[0];
    return badRequest(
      issue?.message ?? 'Invalid input',
      (issue?.path ?? []).map((segment) => String(segment))
    );
  };
  (fn as RouteValidationFunction<z.infer<T>> & { _sourceSchema: unknown })._sourceSchema = schema;
  return fn;
};
