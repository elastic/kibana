/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ES constraint: probability must be in (0, 0.5] or exactly 1
export function computeSamplingProbability({
  totalHits,
  targetSampleSize,
}: {
  totalHits: number;
  targetSampleSize: number;
}): number {
  const rawProbability = targetSampleSize / totalHits;
  return rawProbability < 0.5 ? rawProbability : 1;
}
