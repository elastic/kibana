/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kbnTestConfig } from '@kbn/test';
import { AI_ASSISTANT_ROLE_NAME } from './roles';

const password = kbnTestConfig.getUrlParts().password!;

export const UNAUTHORIZED_USERNAME = 'unauthorized_user';
export const UNAUTHORIZED_USER_PASSWORD = 'unauthorized_password';
export const AI_ASSISTANT_USER_NAME = 'ai_assistant_user';
export const AI_ASSISTANT_USER_PASSWORD = `${AI_ASSISTANT_USER_NAME}-password`;

export interface User {
  username:
    | 'elastic'
    | 'editor'
    | 'viewer'
    | 'secondary_editor'
    | 'unauthorized_user'
    | 'ai_assistant_user';
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

export const aiAssistantUser: User = {
  username: AI_ASSISTANT_USER_NAME,
  password: AI_ASSISTANT_USER_PASSWORD,
  roles: [AI_ASSISTANT_ROLE_NAME],
};

export const allUsers = [editor, secondaryEditor, viewer, unauthorizedUser, aiAssistantUser];
