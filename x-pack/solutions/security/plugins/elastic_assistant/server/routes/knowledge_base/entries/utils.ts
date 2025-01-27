/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';

export const getKBUserFilter = (user: AuthenticatedUser | null) => {
  // Only return the current users entries and all other global entries (where user[] is empty)
  const globalFilter = 'NOT users: {name:* OR id:* }';

  const nameFilter = user?.username ? `users: {name: "${user?.username}"}` : '';
  const idFilter = user?.profile_uid ? `users: {id: ${user?.profile_uid}}` : '';
  const userFilter =
    user?.username && user?.profile_uid
      ? ` OR (${nameFilter} OR ${idFilter})`
      : user?.username
      ? ` OR ${nameFilter}`
      : user?.profile_uid
      ? ` OR ${idFilter}`
      : '';

  return `(${globalFilter}${userFilter})`;
};
