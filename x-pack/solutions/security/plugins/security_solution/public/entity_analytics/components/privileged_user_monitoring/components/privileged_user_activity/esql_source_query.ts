/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PRIV_MON_JOIN = ``;

export const getGrantedRightsEsqlSource = () => {
  return `FROM logs-* METADATA _id, _index
    ${PRIV_MON_JOIN}
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
    | KEEP @timestamp, privileged_user, process.args, target_user, group_name, host_ip, _id, _index`;
};

export const getAccountSwitchesEsqlSource = () => {
  return `FROM logs-* METADATA _id, _index
    ${PRIV_MON_JOIN}
    | WHERE process.command_line.caseless RLIKE "(su|sudo su|sudo -i|sudo -s|ssh [^@]+@[^\s]+)"
    | RENAME process.command_line.caseless AS command_process, process.group_leader.user.name AS target_user, process.parent.real_group.name AS group_name, process.real_user.name as privileged_user, host.ip AS host_ip
    | KEEP @timestamp, privileged_user, host_ip, target_user, group_name, command_process, _id, _index`;
};

export const getAuthenticationsEsqlSource = () => {
  return `FROM logs-okta.system-* METADATA _id, _index
    ${PRIV_MON_JOIN}
    | RENAME source.ip AS host_ip, okta.target.display_name as destination, client.user.name as privileged_user, event.module as source, okta.debug_context.debug_data.url as type, okta.outcome.result as result
    | WHERE privileged_user IS NOT NULL
    | EVAL event_combined = COALESCE(event.action, okta.event_type, event.category)
    | WHERE to_lower(event_combined) RLIKE ".*?(authn|authentication|sso|mfa|token\.grant|authorize\.code|session\.start|unauth_app_access_attempt|evaluate_sign_on|verify_push).*?"
    | KEEP @timestamp, privileged_user, source, type, host_ip, result, destination, okta.authentication_context*, _id, _index`;
};
