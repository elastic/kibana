/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AuthenticatedUser } from '@kbn/core/server';

/**
 * `users` is nested, so a query cannot count its entries. Legacy documents have no
 * `created_by`, and the owner is only defined when that array holds one user.
 */
const LEGACY_SINGLE_USER_SOURCE =
  "def users = params._source['users']; return users instanceof List && users.size() == 1;";

const getUserIdentityTerms = (
  authenticatedUser: AuthenticatedUser,
  field: 'created_by' | 'users'
) => [
  ...(authenticatedUser.profile_uid
    ? [{ term: { [`${field}.id`]: authenticatedUser.profile_uid } }]
    : []),
  { term: { [`${field}.name`]: authenticatedUser.username } },
];

/**
 * Matches conversations owned by the user. `created_by` is the owner when present.
 * Legacy documents have no `created_by` and store the owner as the only `users` entry.
 */
export const getConversationOwnerFilter = (
  authenticatedUser: AuthenticatedUser
): QueryDslQueryContainer => ({
  bool: {
    should: [
      {
        bool: {
          must: [
            { exists: { field: 'created_by' } },
            {
              bool: {
                should: getUserIdentityTerms(authenticatedUser, 'created_by'),
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      {
        bool: {
          must: [
            { bool: { must_not: [{ exists: { field: 'created_by' } }] } },
            {
              script: {
                script: {
                  lang: 'painless',
                  source: LEGACY_SINGLE_USER_SOURCE,
                },
              },
            },
            {
              nested: {
                path: 'users',
                query: {
                  bool: {
                    should: getUserIdentityTerms(authenticatedUser, 'users'),
                    minimum_should_match: 1,
                  },
                },
              },
            },
          ],
        },
      },
    ],
    minimum_should_match: 1,
  },
});
