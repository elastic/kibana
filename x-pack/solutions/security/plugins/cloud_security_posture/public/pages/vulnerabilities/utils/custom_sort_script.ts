/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates Painless sorting in case-insensitive manner
 */
export const getCaseInsensitiveSortScript = (field: string, direction: string) => {
  return {
    _script: {
      type: 'string',
      order: direction,
      script: {
        source: `
          if (doc.containsKey('${field}') && !doc['${field}'].empty) {
            return doc['${field}'].value.toLowerCase();
          } else {
            return "";
          }
        `,
        lang: 'painless',
      },
    },
  };
};
