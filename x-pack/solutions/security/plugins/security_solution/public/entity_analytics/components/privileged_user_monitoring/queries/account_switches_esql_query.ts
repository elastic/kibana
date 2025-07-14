/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { getPrivilegedMonitorUsersJoin, removeInvalidForkBranchesFromESQL } from './helpers';

export const getAccountSwitchesEsqlSource = (
  namespace: string,
  indexPattern: string,
  fields: DataViewFieldMap
) =>
  removeInvalidForkBranchesFromESQL(
    fields,
    `FROM ${indexPattern} METADATA _id, _index
    ${getPrivilegedMonitorUsersJoin(namespace)}
  | WHERE to_lower(process.command_line) RLIKE "(su .*|su|sudo su|sudo -i|sudo -s|ssh [^@]+@[^\s]+)"
  | FORK
    (
        WHERE event.dataset != "endpoint.events.process" AND event.action =="logged-on"
      | EVAL target_user = REPLACE(user.effective.name, "\\\\(.*\\\\)", "")
      | EVAL group_name = COALESCE(user.group.name, user.group.id)
      | RENAME process.command_line AS command_process, user.name as privileged_user, host.ip AS host_ip
    )
    (
        WHERE event.dataset == "endpoint.events.process"
      | RENAME process.command_line AS command_process, process.group_leader.user.name AS target_user, process.parent.real_group.name AS group_name, process.real_user.name as privileged_user, host.ip AS host_ip
    )
    | KEEP @timestamp, privileged_user, host_ip, target_user, group_name, command_process, _id, _index`
  );
