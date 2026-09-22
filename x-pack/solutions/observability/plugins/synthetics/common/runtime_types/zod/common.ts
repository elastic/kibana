/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * zod twins of the hand-written io-ts scalar codecs in `../common.ts`.
 *
 * Nothing imports these yet — they exist so the parity suites can prove they
 * accept and reject exactly what the io-ts originals do before any call site
 * switches over. Export names deliberately match the io-ts ones so the final
 * phase can delete the io-ts module and move this one up a directory.
 *
 * The validation of each io-ts original lives in its *decode* function rather
 * than its `.is()` guard, so each twin reproduces the decode-side rule.
 */

import { z } from '@kbn/zod';
import { isValidNamespace } from '@kbn/fleet-plugin/common';
import {
  inlineScriptIsFullJourneyMessage,
  inlineScriptMissingStepMessage,
  inlineScriptNotAStringMessage,
  invalidNamespaceMessage,
  nonEmptyFieldMessage,
} from '../validation_messages';

/** Applies Fleet namespace rules, not merely `typeof === 'string'`. */
export const NameSpaceString = z.string().superRefine((input, ctx) => {
  const { error, valid } = isValidNamespace(input, true);
  if (!valid) {
    ctx.addIssue({ code: 'custom', message: invalidNamespaceMessage(error) });
  }
});

/**
 * A numeric string. Whitespace-only is rejected before the numeric check
 * because `Number('   ')` is `0`, not `NaN`.
 */
export const TimeoutString = z
  .string()
  .refine((input) => input.trim() !== '' && !isNaN(Number(input)));

/**
 * Trims before the emptiness check, so `z.string().min(1)` is **not** an
 * equivalent — it would accept a whitespace-only value.
 */
export const getNonEmptyStringCodec = (fieldName: string) =>
  z
    .string({ error: nonEmptyFieldMessage(fieldName) })
    .refine((input) => input.trim() !== '', { message: nonEmptyFieldMessage(fieldName) });

/**
 * Inline journey source. A blank script is accepted (it means "not configured
 * yet"); a non-blank one must contain step definitions and must not be a full
 * journey script.
 */
export const InlineScriptString = z
  .string({ error: inlineScriptNotAStringMessage() })
  .superRefine((input, ctx) => {
    if (input.trim() === '') {
      return;
    }

    if (input.includes('journey(')) {
      ctx.addIssue({ code: 'custom', message: inlineScriptIsFullJourneyMessage() });
      return;
    }

    if (!input.includes('step(')) {
      ctx.addIssue({ code: 'custom', message: inlineScriptMissingStepMessage() });
    }
  });

/** Matches `@kbn/securitysolution-io-ts-types` `NonEmptyString`, which trims. */
export const NonEmptyString = z.string().refine((input) => input.trim() !== '');

/**
 * Matches `@kbn/securitysolution-io-ts-types` `NonEmptyArray`, which fails an
 * empty array and otherwise delegates to `t.array(codec)` — so non-array input
 * and each element are validated exactly as the element codec dictates.
 */
export const nonEmptyArray = <T extends z.ZodType>(schema: T) => z.array(schema).min(1);

export const LocationType = z.looseObject({
  lat: z.string(),
  lon: z.string(),
});

export const CheckGeoType = z.looseObject({
  name: z.string(),
  location: LocationType.optional(),
});

export const SummaryType = z.looseObject({
  up: z.number().optional(),
  down: z.number().optional(),
  geo: CheckGeoType.optional(),
});

export const StatesIndexStatusType = z.looseObject({
  indexExists: z.boolean(),
  indices: z.string(),
});

export const DateRangeType = z.looseObject({
  from: z.string(),
  to: z.string(),
});
