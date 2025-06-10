/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import {
  parse,
  Walker,
  walk,
  BasicPrettyPrinter,
  isFunctionExpression,
  isColumn,
  mutate,
} from '@kbn/esql-ast';

import { partition } from 'lodash/fp';
import { getPrivilegedMonitorUsersJoin } from '../../helpers';

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

export const getAccountSwitchesEsqlSource = (
  namespace: string,
  indexPattern: string,
  fields: DataViewFieldMap
) => {
  return `FROM ${indexPattern} METADATA _id, _index
    ${getPrivilegedMonitorUsersJoin(namespace)}
    | WHERE process.command_line.caseless RLIKE "(su|sudo su|sudo -i|sudo -s|ssh [^@]+@[^\s]+)"
    | RENAME process.command_line.caseless AS command_process, process.group_leader.user.name AS target_user, process.parent.real_group.name AS group_name, process.real_user.name as privileged_user, host.ip AS host_ip
    | KEEP @timestamp, privileged_user, host_ip, target_user, group_name, command_process, _id, _index`;
};

// TODO Verify if we can improve the type field logic https://github.com/elastic/security-team/issues/12713
export const getAuthenticationsEsqlSource = (
  namespace: string,
  indexPattern: string,
  fields: DataViewFieldMap
) =>
  removeInvalidForkBranchesFromESQL(
    fields,
    `FROM ${indexPattern} METADATA _id, _index
  ${getPrivilegedMonitorUsersJoin(namespace)}
  | WHERE user.name IS NOT NULL
  | FORK
      (
          WHERE event.dataset	== "okta.system"
        | EVAL event_combined = COALESCE(event.action, okta.event_type, event.category)
        | WHERE to_lower(event_combined) RLIKE ".*?(authn|authentication|sso|mfa|token.grant|authorize.code|session.start|unauth_app_access_attempt|evaluate_sign_on|verify_push).*?"
        | EVAL result = okta.outcome.result
        | EVAL destination = okta.target.display_name
        | EVAL source = event.module
        | EVAL host_ip = source.ip
        | EVAL url = okta.debug_context.debug_data.url
        | EVAL type  = CASE(
          STARTS_WITH(url, "/api/v1/authn"), "Direct",
       STARTS_WITH(url, "/oauth2/v1/authorize") OR STARTS_WITH(url, "/oauth2/v1/token") OR
           LOCATE(url, "/sso/saml") > 0, "Federated",
        null)
      )
      (
          WHERE event.dataset	!= "okta.system" AND event.category == "authentication"
        | EVAL result = event.outcome
        | EVAL source = host.os.name
        | EVAL type  = "Direct"
        | EVAL destination = host.name
        | EVAL host_ip = host.ip
      )
  | RENAME  user.name as privileged_user
  | KEEP @timestamp, privileged_user, source, host_ip, result, destination, _id, _index, event.outcome, type`
  );

// retrieves FORK pattern from the query for ES|QL using ast parsing
export function removeInvalidForkBranchesFromESQL(fields: DataViewFieldMap, esql: string) {
  const { root } = parse(esql);

  const forkIndex = root.commands.findIndex((cmd) => cmd.name === 'fork');
  const forkCommand = root.commands[forkIndex];

  if (!forkCommand) {
    return esql;
  }

  const forkArguments = forkCommand?.args;

  if (!forkArguments || forkArguments.length < 2) {
    throw new Error('Invalid ESQL query: FORK command must have at least two arguments');
  }

  const evalCommands = Walker.commands(forkCommand).filter(
    (command) => command.name === 'eval' || command.name === 'EVAL'
  );
  // Columns create by the eval command
  const evalColumns = evalCommands
    .map((command) => {
      if (isFunctionExpression(command.args[0]) && isColumn(command.args[0].args[0])) {
        return command.args[0].args[0].name;
      }
      return null;
    })
    .filter(Boolean);

  const [invalidBranches, validBranches] = partition((forkArgument) => {
    const missingColumns: string[] = [];
    walk(forkArgument, {
      visitColumn: (node) => {
        if (!evalColumns.includes(node.name) && !fields[node.name]) {
          missingColumns.push(node.name);
        }
      },
    });

    return missingColumns.length > 0;
  }, forkArguments);

  if (invalidBranches.length === 0) {
    return esql;
  } else {
    if (validBranches.length === 0) {
      // No valid FORK branches found
      return undefined;
    }

    if (validBranches.length === 1) {
      // remove the fork command from query and add the valid branch back to the root
      const [validBranch] = validBranches;
      mutate.generic.commands.remove(root, forkCommand);

      validBranch.commands.reverse().forEach((command) => {
        mutate.generic.commands.insert(root, command, forkIndex);
      });

      return BasicPrettyPrinter.multiline(root);
    }

    // Remove the invalid branch
    invalidBranches.forEach((branch) => {
      mutate.generic.commands.args.remove(root, branch); // TODO parse?
    });

    return BasicPrettyPrinter.multiline(root);
  }
}
