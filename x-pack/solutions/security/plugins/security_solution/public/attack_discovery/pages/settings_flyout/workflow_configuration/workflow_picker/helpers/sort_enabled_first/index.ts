/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const sortEnabledFirst = <T extends { enabled?: boolean }>(items: T[]): T[] =>
  [...items].sort((a, b) => {
    const aEnabled = a.enabled !== false ? 1 : 0;
    const bEnabled = b.enabled !== false ? 1 : 0;

    return bEnabled - aEnabled;
  });
