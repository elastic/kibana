/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface StructuredOutputResult<T> {
  raw: { response_metadata: Record<string, unknown> };
  parsed: T;
}

export const requireParsedStructuredOutput = <T>(
  result: StructuredOutputResult<T | null>,
  stage: string
): StructuredOutputResult<T> => {
  if (result.parsed === null) {
    throw new Error(`${stage} returned no parsed output`);
  }

  return { raw: result.raw, parsed: result.parsed };
};
