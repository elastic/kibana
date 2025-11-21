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
    message: `API [${routeDetails}] is unauthorized for user, this action is granted by the Kibana privileges [securitySolution]`,
    statusCode: 403,
  };
};
