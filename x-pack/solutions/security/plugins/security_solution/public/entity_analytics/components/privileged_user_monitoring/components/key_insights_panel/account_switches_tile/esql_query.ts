/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersJoin } from '../../../queries/helpers';

export const getAccountSwitchesEsqlCount = (namespace: string) => {
  return `FROM logs-* METADATA _id, _index
    ${getPrivilegedMonitorUsersJoin(namespace)}
    | WHERE to_lower(process.command_line) RLIKE "(su|sudo su|sudo -i|sudo -s|ssh [^@]+@[^\s]+)"
    | STATS COUNT(*)`;
};
