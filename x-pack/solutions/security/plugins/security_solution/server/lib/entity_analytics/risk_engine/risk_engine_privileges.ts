/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  StartServicesAccessor,
} from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { i18n } from '@kbn/i18n';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import {
  TO_RUN_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  TO_ENABLE_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
  getMissingRiskEnginePrivileges,
} from '../../../../common/entity_analytics/risk_engine';
import { checkAndFormatPrivileges } from '../utils/check_and_format_privileges';

export const getRunRiskEnginePrivileges = async (
  request: KibanaRequest,
  security: SecurityPluginStart
) => {
  return checkAndFormatPrivileges({
    request,
    security,
    privilegesToCheck: {
      elasticsearch: {
        cluster: TO_RUN_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
        index: {},
      },
    },
  });
};

export const getEnableRiskEnginePrivileges = async (
  request: KibanaRequest,
  security: SecurityPluginStart
) => {
  return checkAndFormatPrivileges({
    request,
    security,
    privilegesToCheck: {
      elasticsearch: {
        cluster: TO_ENABLE_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
        index: RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
      },
    },
  });
};

export const _getMissingPrivilegesMessage = (riskEnginePrivileges: EntityAnalyticsPrivileges) => {
  const { indexPrivileges, clusterPrivileges } = getMissingRiskEnginePrivileges(
    riskEnginePrivileges.privileges
  );

  const indexPrivilegesMessage = indexPrivileges
    .map(([indexName, privileges]) =>
      i18n.translate('xpack.securitySolution.entityAnalytics.riskEngine.missingIndexPrivilege', {
        defaultMessage: 'Missing index privileges for index "{indexName}": {privileges}.',
        values: {
          indexName,
          privileges: privileges.join(', '),
        },
      })
    )
    .join('\n');

  const clusterRunPrivilegesMessage = !clusterPrivileges.run.length
    ? ''
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.riskEngine.missingClusterRunPrivilege',
        {
          defaultMessage: 'Missing cluster privileges to run the risk engine: {privileges}.',
          values: {
            privileges: clusterPrivileges.run.join(', '),
          },
        }
      );

  const clusterEnablePrivilegesMessage = !clusterPrivileges.enable.length
    ? ''
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.riskEngine.missingClusterEnablePrivilege',
        {
          defaultMessage: 'Missing cluster privileges to enable the risk engine: {privileges}.',
          values: {
            privileges: clusterPrivileges.enable.join(', '),
          },
        }
      );

  const unauthorizedMessage = i18n.translate(
    'xpack.securitySolution.entityAnalytics.riskEngine.unauthorized',
    {
      defaultMessage: 'User is missing risk engine privileges.',
    }
  );

  return `${unauthorizedMessage} ${indexPrivilegesMessage} ${clusterRunPrivilegesMessage} ${clusterEnablePrivilegesMessage}`;
};

/**
 * This function is used to check if the user has the required privileges to access the risk engine.
 * It is used to wrap a risk engine route handler which requires full access to the risk engine.
 * @param getStartServices - Kibana's start services accessor
 * @param handler - The route handler to wrap
 **/
export const withRiskEnginePrivilegeCheck = <P, Q, B>(
  privilegeTypeOrServices:
    | 'run'
    | 'enable'
    | StartServicesAccessor<SecuritySolutionPluginStartDependencies, unknown>,
  handlerOrServices:
    | ((
        context: SecuritySolutionRequestHandlerContext,
        request: KibanaRequest<P, Q, B>,
        response: KibanaResponseFactory
      ) => Promise<IKibanaResponse>)
    | StartServicesAccessor<SecuritySolutionPluginStartDependencies, unknown>,
  optionalHandler?: (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest<P, Q, B>,
    response: KibanaResponseFactory
  ) => Promise<IKibanaResponse>
) => {
  // Determine if privilegeType is provided or if it's the default case
  let privilegeType: 'run' | 'enable' = 'enable';
  let getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies, unknown>;
  let handler: (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest<P, Q, B>,
    response: KibanaResponseFactory
  ) => Promise<IKibanaResponse>;

  if (typeof privilegeTypeOrServices === 'string') {
    // First parameter is the privilegeType
    privilegeType = privilegeTypeOrServices;
    getStartServices = handlerOrServices as StartServicesAccessor<
      SecuritySolutionPluginStartDependencies,
      unknown
    >;
    if (optionalHandler === undefined) {
      throw new Error('Handler is required when using privilege type parameter');
    }
    handler = optionalHandler;
  } else {
    // First parameter is getStartServices, privilegeType is default 'enable'
    getStartServices = privilegeTypeOrServices;
    handler = handlerOrServices as (
      context: SecuritySolutionRequestHandlerContext,
      request: KibanaRequest<P, Q, B>,
      response: KibanaResponseFactory
    ) => Promise<IKibanaResponse>;
  }

  return async (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest<P, Q, B>,
    response: KibanaResponseFactory
  ) => {
    const [_, { security }] = await getStartServices();
    const privilegeCheckFn =
      privilegeType === 'run' ? getRunRiskEnginePrivileges : getEnableRiskEnginePrivileges;
    const privileges = await privilegeCheckFn(request, security);
    if (!privileges.has_all_required) {
      const siemResponse = buildSiemResponse(response);
      return siemResponse.error({
        statusCode: 403,
        body: _getMissingPrivilegesMessage(privileges),
      });
    }
    return handler(context, request, response);
  };
};
