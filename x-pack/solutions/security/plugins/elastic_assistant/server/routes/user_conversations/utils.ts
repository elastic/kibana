/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getUserFilter = ({
  name,
  id,
  isOwner,
}: {
  name?: string;
  id?: string;
  isOwner: boolean;
}) => {
  const globalUsersFilter = `(NOT users: { name: * } and NOT users: { id: * })`;
  if (!name && !id) {
    // global user search only
    return globalUsersFilter;
  }
  const userFilter =
    name && id
      ? `users:{ name: "${name}" OR id: "${id}" }`
      : name
      ? `users:{ name: "${name}" }`
      : `users:{ id: "${id}" }`;

  const sharedFilter = ` OR ${globalUsersFilter}`;

  const onlyOwnerFilter = `(${id ? `created_by.id : "${id}"` : ''}${id && name ? ' OR ' : ''}${
    name ? `created_by.name : "${name}"` : ''
  }) OR (NOT created_by:* AND ${userFilter})`;
  return isOwner ? onlyOwnerFilter : `${userFilter}${sharedFilter}`;
};
