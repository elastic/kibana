/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';
import { isEmpty } from 'lodash/fp';

import { ALERT_ATTACK_DISCOVERY_USERS } from '../../schedules/fields/field_names';

/** A KQL "users field is empty" query */
export const EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL = `${ALERT_ATTACK_DISCOVERY_USERS}: ""`;

/** A KQL "users field does NOT exist" query */
export const ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL = `NOT ${ALERT_ATTACK_DISCOVERY_USERS}: { name: * }`;

interface GetFilterParams {
  authenticatedUser: AuthenticatedUser;
  filter?: string;
  shared?: boolean;
}

export const getSharedFilter = (shared?: boolean): string => {
  if (shared === undefined) {
    // the shared filter will be applied after the user filter, joined with a leading `OR`
    return ` OR ${EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL} OR ${ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL}`;
  }

  // if shared is explicitly true, there won't be a leading `OR` to join with the user filter
  return shared
    ? `${EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL} OR ${ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL}`
    : ''; // shared is false, so no shared filter
};

export const getUserNameOrId = (authenticatedUser: AuthenticatedUser): string =>
  !isEmpty(authenticatedUser.username)
    ? `name: "${authenticatedUser.username}"`
    : `id: "${authenticatedUser.profile_uid}"`;

export const getUserFilter = ({
  authenticatedUser,
  shared,
}: {
  authenticatedUser: AuthenticatedUser;
  shared?: boolean;
}): string => {
  // If shared is (explicitly) true, we don't need to filter by user
  if (shared) {
    return '';
  }

  const userNameOrId = getUserNameOrId(authenticatedUser);

  return `${ALERT_ATTACK_DISCOVERY_USERS}: { ${userNameOrId} }`;
};

export const getAdditionalFilter = (filter?: string): string =>
  filter != null ? ` AND ${filter}` : '';

export const getCombinedFilter = ({
  authenticatedUser,
  filter,
  shared,
}: GetFilterParams): string => {
  const sharedFilter = getSharedFilter(shared);
  const userFilter = getUserFilter({ authenticatedUser, shared });
  const additionalFilter = getAdditionalFilter(filter);

  return `(${userFilter}${sharedFilter})${additionalFilter}`;
};
