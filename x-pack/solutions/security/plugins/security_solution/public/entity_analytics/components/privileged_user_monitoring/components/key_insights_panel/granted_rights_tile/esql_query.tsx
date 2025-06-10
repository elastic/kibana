/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegedMonitorUsersJoin } from '../../../helpers';

export const getGrantedRightsEsqlCount = (namespace: string) => {
  return `FROM logs-* METADATA _id, _index
    ${getPrivilegedMonitorUsersJoin(namespace)}
    | WHERE (host.os.type == "linux"
      AND event.type == "start"
      AND event.action IN ("exec", "exec_event", "start", "ProcessRollup2", "executed", "process_started")
      AND (
        process.name IN ("usermod", "adduser") OR
        (process.name == "gpasswd" AND process.args IN ("-a", "--add", "-M", "--members"))
      )) OR (
      host.os.type=="windows"
      AND event.action=="added-member-to-group"
    ) OR (
      okta.event_type IN ("group.user_membership.add",  "user.account.privilege.grant")
     )
    | EVAL okta_privilege = MV_FIRST(okta.target.display_name)
    | EVAL group_name = COALESCE(group.name, user.target.group.name, okta_privilege)
    | EVAL host_ip = COALESCE(host.ip, source.ip)
    | EVAL target_user = COALESCE(user.target.name, user.target.full_name, winlog.event_data.TargetUserName)  
    | EVAL privileged_user = COALESCE(source.user.name, user.name)  
    | STATS COUNT(*)`;
};
