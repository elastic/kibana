/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Finds matching reference link for a vulnerability ID
 */
export const findReferenceLink = (references: string[], id: string): string | null => {
  const foundReference = references.find((ref) => {
    try {
      const url = new URL(ref);
      const hasMatchingPathname = url.pathname?.toLowerCase().includes(id?.toLowerCase());

      let hasMatchingParam = false;
      url.searchParams.forEach((value, _) => {
        if (value === id || value.toLowerCase().includes(id.toLowerCase())) {
          hasMatchingParam = true;
        }
      });

      return hasMatchingParam || hasMatchingPathname;
    } catch {
      return false;
    }
  });

  return foundReference ?? null;
};
