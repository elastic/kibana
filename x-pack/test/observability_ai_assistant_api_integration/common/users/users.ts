/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kbnTestConfig } from '@kbn/test';
const password = kbnTestConfig.getUrlParts().password!;

export interface User {
  username: 'elastic' | 'editor' | 'viewer';
  password: string;
  roles: string[];
}

export const editorUser: User = {
  username: 'editor',
  password,
  roles: ['editor'],
};

export const viewerUser: User = {
  username: 'viewer',
  password,
  roles: ['viewer'],
};

export const allUsers = [editorUser, viewerUser];
