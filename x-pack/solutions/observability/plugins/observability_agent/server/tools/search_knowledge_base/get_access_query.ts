/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';

export function getAccessQuery({
  user,
  namespace,
}: {
  user: AuthenticatedUser | null;
  namespace?: string;
}) {
  return [
    {
      bool: {
        filter: [
          {
            bool: {
              should: [{ term: { public: true } }, ...getUserAccessFilters(user)],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              // either no namespace on the document or it matches the provided one
              should: [
                { term: { namespace } },
                { bool: { must_not: { exists: { field: 'namespace' } } } },
              ],
            },
          },
        ],
      },
    },
  ];
}

function getUserAccessFilters(user: AuthenticatedUser | null) {
  if (!user) {
    return [];
  }

  if (user.profile_uid) {
    return [
      { term: { 'user.id': user.profile_uid } },
      {
        bool: {
          must_not: { exists: { field: 'user.id' } },
          must: { term: { 'user.name': user.username } },
        },
      },
    ];
  }

  return [{ term: { 'user.name': user.username } }];
}
