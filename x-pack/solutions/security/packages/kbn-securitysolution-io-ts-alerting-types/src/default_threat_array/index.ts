/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/Either';
import { threats, Threats } from '../threat';

/**
 * Types the DefaultThreatArray as:
 *   - If null or undefined, then an empty array will be set
 */
export const DefaultThreatArray = new t.Type<Threats, Threats | undefined, unknown>(
  'DefaultThreatArray',
  threats.is,
  (input, context): Either<t.Errors, Threats> =>
    input == null ? t.success([]) : threats.validate(input, context),
  t.identity
);
