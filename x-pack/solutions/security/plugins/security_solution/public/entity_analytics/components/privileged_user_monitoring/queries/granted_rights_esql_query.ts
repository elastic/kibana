/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { getPrivilegedMonitorUsersJoin, removeInvalidForkBranchesFromESQL } from './helpers';

export const getGrantedRightsEsqlSource = (
  namespace: string,
  indexPattern: string,
  fields: DataViewFieldMap
) =>
  removeInvalidForkBranchesFromESQL(
    fields,
    `FROM ${indexPattern} METADATA _id, _index
  ${getPrivilegedMonitorUsersJoin(namespace)}
  | FORK
    (
        WHERE event.dataset	== "okta.system" AND okta.event_type IN ("group.user_membership.add",  "user.account.privilege.grant")
      | EVAL group_name = MV_FIRST(okta.target.display_name)
      | EVAL host_ip = source.ip
      | EVAL target_user = user.target.full_name
      | EVAL privileged_user = COALESCE(source.user.name, user.name)
    )
    (
      WHERE (host.os.type == "linux"
        AND event.type == "start"
        AND event.action IN ("exec", "exec_event", "start", "ProcessRollup2", "executed", "process_started")
        AND (
          process.name IN ("usermod", "adduser") OR
          (process.name == "gpasswd" AND process.args IN ("-a", "--add", "-M", "--members"))
        )) OR (
          host.os.type=="windows" AND event.action=="added-member-to-group"
        )
      | EVAL group_name = COALESCE(group.name, user.target.group.name)
      | EVAL host_ip = host.ip
      | EVAL target_user = COALESCE(user.target.name, user.target.full_name, winlog.event_data.TargetUserName)
      | EVAL privileged_user = user.name
    )
  | KEEP @timestamp, privileged_user, target_user, group_name, host_ip, _id, _index`
  );
