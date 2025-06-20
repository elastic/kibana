/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaType } from '../../types';

export const getFormulaForSchema = ({
  schemas,
  formulaBySchema,
}: {
  formulaBySchema: FormulaType;
  schemas: Array<'ecs' | 'semconv'>;
}): any => {
  const hasEcs = schemas.includes('ecs');
  const hasSemconv = schemas.includes('semconv');

  if (hasEcs && hasSemconv) {
    return formulaBySchema.hybrid;
  }

  if (hasEcs) {
    return formulaBySchema.ecs;
  }

  if (hasSemconv) {
    return formulaBySchema.semconv;
  }

  return formulaBySchema.ecs;
};
