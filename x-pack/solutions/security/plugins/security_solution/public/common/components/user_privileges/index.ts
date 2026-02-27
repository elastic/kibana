/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import type { DeepReadonly } from 'utility-types';
import type { UserPrivilegesState } from './user_privileges_context';
import { UserPrivilegesContext } from './user_privileges_context';

export const useUserPrivileges = (): DeepReadonly<UserPrivilegesState> =>
  useContext(UserPrivilegesContext);
