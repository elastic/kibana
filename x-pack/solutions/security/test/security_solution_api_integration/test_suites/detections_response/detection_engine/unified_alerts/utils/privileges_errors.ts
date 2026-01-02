/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getMissingSecurityKibanaPrivilegesError = ({
  routeDetails,
}: {
  routeDetails: string;
}) => {
  return {
    error: 'Forbidden',
    message: `API [${routeDetails}] is unauthorized for user, this action is granted by the Kibana privileges [alerts-read]`,
    statusCode: 403,
  };
};

export const getMissingReadIndexPrivilegesError = ({
  username,
  roles,
}: {
  username: string;
  roles: string[];
}) => {
  return {
    message: `security_exception: action [indices:data/read/search] is unauthorized for user [${username}] with effective roles [${roles}], this action is granted by the index privileges [read,all]`,
    status_code: 403,
  };
};

export const getServerlessMissingReadIndexPrivilegesErrorPattern = () => {
  return new RegExp(
    '^security_exception: action \\[indices:data/read/search\\] is unauthorized for API key id \\[.+?\\] of user \\[.+?\\], this action is granted by the index privileges \\[read,all\\]$'
  );
};
