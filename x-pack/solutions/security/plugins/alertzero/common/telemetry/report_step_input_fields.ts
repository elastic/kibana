/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SystemSecurityWorkerCatalogEntry } from '@kbn/alertzero-common';
import { z } from '@kbn/zod/v4';
import { DETECTION_RULE_TYPES } from './constants';
import { toDetectionRuleType } from './to_detection_rule_type';

/** Upper bound for every reported count, far above any real Worker run. */
export const MAX_REPORTED_COUNT = 1_000_000;

const INTEGER_STRING = /^\d+$/;

/** Liquid renders a missing value as `''`; treat it (and `null`) as absent. */
export const toAbsent = (value: unknown): unknown =>
  value === '' || value === null ? undefined : value;

/** Also accepts the integer text a `{{ }}` template renders. */
const toCount = (value: unknown): unknown => {
  const present = toAbsent(value);
  return typeof present === 'string' && INTEGER_STRING.test(present) ? Number(present) : present;
};

/** Also accepts the `true` / `false` text a `{{ }}` template renders. */
const toFlag = (value: unknown): unknown => {
  const present = toAbsent(value);
  if (present === 'true') {
    return true;
  }
  if (present === 'false') {
    return false;
  }
  return present;
};

export const countInput = (description: string) =>
  z
    .preprocess(toCount, z.number().int().min(0).max(MAX_REPORTED_COUNT).default(0))
    .describe(description);

export const flagInput = (description: string) =>
  z.preprocess(toFlag, z.boolean().default(false)).describe(description);

/** A flag Worker YAML always renders, so an empty value fails instead of defaulting. */
export const requiredFlagInput = (description: string) =>
  z.preprocess(toFlag, z.boolean()).describe(description);

export const optionalFlagInput = (description: string) =>
  z.preprocess(toFlag, z.boolean().optional()).describe(description);

/** A required closed vocabulary value, which Worker YAML always renders. */
export const oneOfInput = <T extends readonly [string, ...string[]]>(
  values: T,
  description: string
) => z.enum(values).describe(description);

/** A closed vocabulary value that falls back to `fallback` when Liquid renders nothing. */
export const oneOfOrDefaultInput = <T extends readonly [string, ...string[]]>(
  values: T,
  fallback: T[number],
  description: string
) => z.preprocess(toAbsent, z.enum(values).default(fallback)).describe(description);

/** A closed vocabulary value, absent when Liquid renders nothing. */
export const optionalOneOfInput = <T extends readonly [string, ...string[]]>(
  values: T,
  description: string
) => z.preprocess(toAbsent, z.enum(values).optional()).describe(description);

/** The Worker's own Investigation, which every step reporting the event has. */
export const investigationIdInput = (description: string) =>
  z.preprocess(toAbsent, z.uuid()).describe(description);

/**
 * The Worker's own Investigation, absent only in the one case the event names; the server step
 * rejects any other absence (`find_outcome_contradictions.ts`).
 */
export const optionalInvestigationIdInput = (description: string) =>
  z.preprocess(toAbsent, z.uuid().optional()).describe(description);

/**
 * A detection rule's own `type`, mapped to the #19891 vocabulary here so Worker YAML passes it
 * through; absent when Liquid renders nothing.
 */
export const detectionRuleTypeInput = (description: string) =>
  z.preprocess(toDetectionRuleType, z.enum(DETECTION_RULE_TYPES).optional()).describe(description);

/** Any catalogued Worker may report the event. */
export const ANY_CATALOG_WORKER = 'any_catalog_worker' as const;

/** The Worker whose run may report an event, or `ANY_CATALOG_WORKER`. */
export type ReportingWorkerId = SystemSecurityWorkerCatalogEntry['id'] | typeof ANY_CATALOG_WORKER;

/** Checks that each input schema reports the event it is listed under. */
export const defineReportableEvents = <
  T extends { [E in keyof T]: z.ZodType<{ event: E & string }> }
>(
  workerId: ReportingWorkerId,
  inputSchemas: T
): { [E in keyof T]: { workerId: ReportingWorkerId; inputSchema: T[E] } } =>
  // `Object.fromEntries` types its result as a string record; its keys are exactly those of `inputSchemas`.
  Object.fromEntries(
    Object.entries(inputSchemas).map(([event, inputSchema]) => [event, { workerId, inputSchema }])
  ) as { [E in keyof T]: { workerId: ReportingWorkerId; inputSchema: T[E] } };
