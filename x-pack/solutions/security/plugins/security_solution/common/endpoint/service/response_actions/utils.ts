/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ConsoleResponseActionCommands,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
  NO_SPECIFIC_PRIVILEGE_REQUIRED,
} from './constants';
import type { EndpointPrivileges } from '../../types';

export const getRbacControl = ({
  commandName,
  privileges,
}: {
  commandName: ConsoleResponseActionCommands;
  privileges: EndpointPrivileges;
}): boolean => {
  const requiredPrivilege = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[commandName];

  // For commands that don't require specific privileges, always return true
  if (requiredPrivilege === NO_SPECIFIC_PRIVILEGE_REQUIRED) {
    return true;
  }

  return Boolean(privileges[requiredPrivilege]);
};
