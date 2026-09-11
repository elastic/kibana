/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { Either } from 'fp-ts/Either';
import { isValidNamespace } from '@kbn/fleet-plugin/common';
import {
  inlineScriptIsFullJourneyMessage,
  inlineScriptMissingStepMessage,
  inlineScriptNotAStringMessage,
  invalidNamespaceMessage,
  nonEmptyFieldMessage,
} from './validation_messages';

export const NameSpaceString = new t.Type<string, string, unknown>(
  'NameSpaceString',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input === 'string') {
      const { error, valid } = isValidNamespace(input, true);
      if (!valid) {
        return t.failure(input, context, invalidNamespaceMessage(error));
      }

      return t.success(input);
    } else {
      return t.failure(input, context);
    }
  },
  t.identity
);

export type NameSpaceStringC = typeof NameSpaceString;

export const TimeoutString = new t.Type<string, string, unknown>(
  'TimeoutString',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input === 'string' && input.trim() !== '' && !isNaN(Number(input))) {
      return t.success(input);
    } else {
      return t.failure(input, context);
    }
  },
  t.identity
);

export const getNonEmptyStringCodec = (fieldName: string) => {
  return new t.Type<string, string, unknown>(
    'NonEmptyString',
    t.string.is,
    (input, context): Either<t.Errors, string> => {
      if (typeof input === 'string' && input.trim() !== '') {
        return t.success(input);
      } else {
        return t.failure(input, context, nonEmptyFieldMessage(fieldName));
      }
    },
    t.identity
  );
};

export const InlineScriptString = new t.Type<string, string, unknown>(
  'InlineScriptString',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input === 'string' && input.trim() !== '') {
      // return false if script contains import or require statement
      if (input.includes('journey(')) {
        return t.failure(input, context, inlineScriptIsFullJourneyMessage());
      }
      // should contain at least one step definition
      if (!input.includes('step(')) {
        return t.failure(input, context, inlineScriptMissingStepMessage());
      }

      return t.success(input);
    } else {
      if (typeof input === 'string' && input.trim() === '') {
        return t.success(input);
      }
      return t.failure(input, context, inlineScriptNotAStringMessage());
    }
  },
  t.identity
);

export type InlineScriptStringC = typeof InlineScriptString;

export const LocationType = t.type({
  lat: t.string,
  lon: t.string,
});

export const CheckGeoType = t.intersection([
  t.type({
    name: t.string,
  }),
  t.partial({
    location: LocationType,
  }),
]);

export const SummaryType = t.partial({
  up: t.number,
  down: t.number,
  geo: CheckGeoType,
});

export const StatesIndexStatusType = t.type({
  indexExists: t.boolean,
  indices: t.string,
});

export const DateRangeType = t.type({
  from: t.string,
  to: t.string,
});

export type Summary = t.TypeOf<typeof SummaryType>;
export type Location = t.TypeOf<typeof LocationType>;
export type GeoPoint = t.TypeOf<typeof CheckGeoType>;
export type StatesIndexStatus = t.TypeOf<typeof StatesIndexStatusType>;
export type DateRange = t.TypeOf<typeof DateRangeType>;
