/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UPGRADE_LICENSE_MESSAGE } from '@kbn/elastic-assistant-common';

export const getMissingAssistantLicenseError = () => {
  return {
    statusCode: 403,
    error: 'Forbidden',
    message: UPGRADE_LICENSE_MESSAGE,
  };
};

export const getMissingSecurityAndAttackDiscoveryKibanaPrivilegesError = ({
  routeDetails,
}: {
  routeDetails: string;
}) => {
  return {
    error: 'Forbidden',
    message: `API [${routeDetails}] is unauthorized for user, this action is granted by the Kibana privileges [securitySolution,securitySolution-attackDiscoveryAll]`,
    statusCode: 403,
  };
};

export const getMissingAttackDiscoveryKibanaPrivilegesError = ({
  routeDetails,
}: {
  routeDetails: string;
}) => {
  return {
    error: 'Forbidden',
    message: `API [${routeDetails}] is unauthorized for user, this action is granted by the Kibana privileges [securitySolution-attackDiscoveryAll]`,
    statusCode: 403,
  };
};

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
