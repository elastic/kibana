/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Returns true if the last n generations are repeating the same output */
export const generationsAreRepeating = ({
  currentGeneration,
  previousGenerations,
  sampleLastNGenerations,
}: {
  currentGeneration: string;
  previousGenerations: string[];
  sampleLastNGenerations: number;
}): boolean => {
  const generationsToSample = previousGenerations.slice(-sampleLastNGenerations);

  if (generationsToSample.length < sampleLastNGenerations) {
    return false; // Not enough generations to sample
  }

  return generationsToSample.every((generation) => generation === currentGeneration);
};
