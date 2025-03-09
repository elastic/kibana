/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import moment from 'moment';
import objectHash from 'object-hash';
import type { PrivilegedUserDoc } from '../../../../../common/api/entity_analytics/privmon';

export const mergePrivilegedUsers = (privilegedUsers: PrivilegedUserDoc[]): PrivilegedUserDoc => {
  const mergedUser = _.cloneDeep(privilegedUsers[0]);

  for (let i = 1; i < privilegedUsers.length; i++) {
    const privilegedUser = privilegedUsers[i];

    mergedUser.user = { ...mergedUser.user, ...privilegedUser.user };

    // take lower created_at
    mergedUser.created_at = moment
      .min(moment(mergedUser.created_at), moment(privilegedUser.created_at))
      .toISOString();

    // take higher @timestamp
    mergedUser['@timestamp'] = moment
      .max(moment(mergedUser['@timestamp']), moment(privilegedUser['@timestamp']))
      .toISOString();

    // take active true over active false
    mergedUser.active = mergedUser.active || privilegedUser.active;

    // merge observations
    mergedUser.observations = [...mergedUser.observations, ...privilegedUser.observations];
  }

  return mergedUser;
};

export const maybeMergePrivilegedUsers = (
  privilegedUsers: PrivilegedUserDoc[]
): PrivilegedUserDoc | undefined => {
  if (!privilegedUsers.length) {
    return undefined;
  }

  return mergePrivilegedUsers(privilegedUsers);
};

export const mergePrivilegedUsersByUser = (
  privilegedUsers: PrivilegedUserDoc[]
): PrivilegedUserDoc[] => {
  const privilegedUsersByUser = new Map<string, PrivilegedUserDoc[]>();

  for (const privilegedUser of privilegedUsers) {
    const user = privilegedUser.user;
    const id = objectHash(user);
    const existingPrivilegedUsers = privilegedUsersByUser.get(id) || [];
    privilegedUsersByUser.set(id, [...existingPrivilegedUsers, privilegedUser]);
  }

  return Array.from(privilegedUsersByUser.values())
    .map(maybeMergePrivilegedUsers)
    .filter((user): user is PrivilegedUserDoc => user !== undefined);
};
