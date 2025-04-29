/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kbnTestConfig } from '@kbn/test';

const password = kbnTestConfig.getUrlParts().password!;

export const UNAUTHORIZED_USERNAME = 'unauthorized_user';
export const UNAUTHORIZED_USER_PASSWORD = 'unauthorized_password';

export interface User {
  username: 'elastic' | 'editor' | 'viewer' | 'secondary_editor' | 'unauthorized_user';
  password: string;
  roles: string[];
}

export const editor: User = {
  username: 'editor',
  password,
  roles: ['editor'],
};

export const secondaryEditor: User = {
  username: 'secondary_editor',
  password,
  roles: ['editor'],
};

export const viewer: User = {
  username: 'viewer',
  password,
  roles: ['viewer'],
};

export const unauthorizedUser: User = {
  username: UNAUTHORIZED_USERNAME,
  password: UNAUTHORIZED_USER_PASSWORD,
  roles: [],
};

export const allUsers = [editor, secondaryEditor, viewer, unauthorizedUser];
