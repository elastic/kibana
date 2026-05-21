/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-search';

/**
 * Creates a role for a user with limited permissions who can only access
 * Index Management (Data Management panel) in a specific space.
 * This role is useful for testing limited permission scenarios on the homepage.
 */
export const createDataManagementUserRole = (spaceId: string): KibanaRole => ({
  elasticsearch: {
    cluster: ['monitor'],
    indices: [
      {
        names: ['*'],
        privileges: ['manage'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        enterpriseSearch: ['all'],
      },
      spaces: [spaceId],
    },
  ],
});
