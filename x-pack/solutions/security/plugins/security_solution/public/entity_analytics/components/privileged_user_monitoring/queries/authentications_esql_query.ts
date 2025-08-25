/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { getPrivilegedMonitorUsersJoin, removeInvalidForkBranchesFromESQL } from './helpers';

// TODO add test cases for okta type column logic
// '/api/v1/authn/something' ===> Direct
// /oauth2/v1/authorize' ===> Federated
// /oauth2/v1/token' ===> Federated
// /some/path/sso/saml' ===> Federated
// /api/v1/authn' ===> Direct

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
        | EVAL type = CASE(
          STARTS_WITH(url, "/api/v1/authn"), "Direct",
       STARTS_WITH(url, "/oauth2/v1/authorize") OR STARTS_WITH(url, "/oauth2/v1/token") OR
           LOCATE(url, "/sso/saml") > 0, "Federated",
        null)
      )
      (
          WHERE event.dataset	!= "okta.system" AND event.category == "authentication"
        | EVAL result = event.outcome
        | EVAL source = host.os.name
        | EVAL type = "Direct"
        | EVAL destination = host.name
        | EVAL host_ip = host.ip
      )
  | RENAME user.name as privileged_user
| KEEP @timestamp, privileged_user, source, host_ip, result, destination, _id, _index, event.outcome, type`
  );
