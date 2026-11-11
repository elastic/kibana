/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Thrown when an investigation's context does not match the contract for its subject type.
 *
 * The route schema rejects malformed HTTP bodies before they reach the client, but the workflow
 * step definition types its context as a plain record and the plugin start contract takes a
 * TypeScript type, so both can hand the client something the route would have refused. Validating
 * in the client means every caller gets the same answer, and the message comes from the schema
 * rather than from a hand-written check that has to be kept in step with it.
 */
export class InvalidInvestigationContextError extends Error {
  public readonly issues: z.core.$ZodIssue[];

  constructor(subjectType: string, error: z.ZodError) {
    super(`Invalid context for a ${subjectType} investigation: ${z.prettifyError(error)}`);
    this.name = 'InvalidInvestigationContextError';
    this.issues = error.issues;
  }
}
