/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { analyzeSourceQuery, type SourceType } from '@kbn/nightshift-shared';

/** Structural rules, then the one-type rule. Throws a 400 Boom; returns the type to store. */
export const validateSourceQuery = ({ esql }: { esql: string }): SourceType => {
  const analysis = analyzeSourceQuery({ esql });
  if ('error' in analysis) {
    throw badRequest(analysis.error);
  }
  return analysis.type;
};
