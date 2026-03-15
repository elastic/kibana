/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds an Elasticsearch query DSL filter that restricts alerts to the
 * provided set of alert IDs. This filter is used when generating Attack
 * Discoveries scoped to a specific case's alerts.
 */
export const buildCaseAlertFilter = (alertIds: string[]): Record<string, unknown> => ({
  bool: {
    filter: [
      {
        ids: {
          values: alertIds,
        },
      },
    ],
  },
});
