/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { PrivilegedUserDoc } from '../../../../../common/api/entity_analytics/privmon';

export const privilegedUsersToUserQuery = (
  privilegedUsers: PrivilegedUserDoc[],
  logger: Logger
): QueryDslQueryContainer => {
  if (privilegedUsers.length > 500) {
    logger.warn(`Too many privileged users to query: ${privilegedUsers.length}`);
  }
  return {
    bool: {
      should: privilegedUsers.map((privilegedUser) => {
        const should: QueryDslQueryContainer[] = [
          { term: { 'user.name': privilegedUser.user.name } },
        ];

        // do not use ID for now
        // if (privilegedUser.user.id) {
        //   should.push({ term: { 'user.id': privilegedUser.user.id } });
        // }

        // return {
        //   bool: {
        //     should,
        //   },
        // };

        return should[0];
      }),
      minimum_should_match: 1,
    },
  };
};
