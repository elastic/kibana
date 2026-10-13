/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from './status_error';

const DEFAULT_MESSAGE =
  'Significant Events activity is paused. Resume it before triggering new activity.';

/**
 * Thrown when a new-activity trigger is attempted while Significant Events is
 * paused. Surfaces as a 409 Conflict so callers can distinguish "paused" from a
 * permission or availability failure.
 */
export class SignificantEventsPausedError extends StatusError {
  constructor(message: string = DEFAULT_MESSAGE) {
    super(message, 409);
    this.name = 'SignificantEventsPausedError';
  }
}
