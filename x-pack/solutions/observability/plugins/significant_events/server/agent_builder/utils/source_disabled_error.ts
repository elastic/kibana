/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from '../../lib/errors/status_error';

/** Identification cannot start against a source the space has turned off. */
export class SourceDisabledError extends StatusError {
  constructor(slug: string) {
    super(`Source "${slug}" is disabled.`, 400);
    this.name = 'SourceDisabledError';
  }
}
