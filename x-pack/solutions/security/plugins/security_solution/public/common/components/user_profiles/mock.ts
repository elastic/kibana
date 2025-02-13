/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockCurrentUserProfile = {
  uid: 'current-user',
  enabled: true,
  user: { username: 'current.user' },
  data: {},
};

export const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'user1' }, data: {} },
  { uid: 'user-id-2', enabled: true, user: { username: 'user2' }, data: {} },
];
