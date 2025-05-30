/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const extractJson = (input: unknown): string => {
  if (typeof input !== 'string') {
    return '';
  }

  const regex = /```json\s*([\s\S]*?)(?:\s*```|$)/;
  const match = input.match(regex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return input;
};
