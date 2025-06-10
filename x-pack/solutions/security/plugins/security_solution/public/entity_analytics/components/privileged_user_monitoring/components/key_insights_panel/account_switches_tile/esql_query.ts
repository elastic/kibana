/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersJoin } from '../../../helpers';

export const getAccountSwitchesEsqlCount = (namespace: string) => {
  return `FROM logs-* METADATA _id, _index
      ${getPrivilegedMonitorUsersJoin(namespace)}
      | WHERE process.command_line.caseless RLIKE "(su|sudo su|sudo -i|sudo -s|ssh [^@]+@[^\s]+)"
      | RENAME process.command_line.caseless AS command_process, process.group_leader.user.name AS target_user, process.parent.real_group.name AS group_name, process.real_user.name as privileged_user, host.ip AS host_ip
      | STATS COUNT(*)`;
};
