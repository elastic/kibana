/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import { QUERY_RULE_TYPE_ID, SAVED_QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type { Logger, StartServicesAccessor, IKibanaResponse } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import {
  DEFAULT_PREVIEW_INDEX,
  DETECTION_ENGINE_RULES_PREVIEW,
} from '../../../../../../common/constants';
import { validateCreateRuleProps } from '../../../../../../common/api/detection_engine/rule_management';
import type {
  RulePreviewResponse,
  RulePreviewLogs,
} from '../../../../../../common/api/detection_engine';
import {
  RulePreviewRequestBody,
  RulePreviewRequestQuery,
} from '../../../../../../common/api/detection_engine';

import type { StartPlugins, SetupPlugins } from '../../../../../plugin';
import { buildSiemResponse } from '../../../routes/utils';
import { createPreviewRuleExecutionLogger } from './preview_rule_execution_logger';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import type { ConfigType } from '../../../../../config';
import type {
  CreateSecurityRuleTypeWrapperProps,
  SecurityAlertType,
} from '../../../rule_types/types';
import {
  createEqlAlertType,
  createEsqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createQueryAlertType,
  createThresholdAlertType,
  createNewTermsAlertType,
} from '../../../rule_types';
import { createSecurityRuleTypeWrapper } from '../../../rule_types/create_security_rule_type_wrapper';
import { assertUnreachable } from '../../../../../../common/utility_types';
import { applyRuleDefaults } from '../../../rule_management/logic/detection_rules_client/mergers/apply_rule_defaults';
import { convertRuleResponseToAlertingRule } from '../../../rule_management/logic/detection_rules_client/converters/convert_rule_response_to_alerting_rule';
import { runRuleExecutors } from './run_rule_executors';

const MAX_ROUTE_CONCURRENCY = 10;

export const previewRulesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  security: SetupPlugins['security'],
  securityRuleTypeOptions: CreateSecurityRuleTypeWrapperProps,
  previewRuleDataClient: IRuleDataClient,
  getStartServices: StartServicesAccessor<StartPlugins>,
  logger: Logger,
  isServerless: boolean
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_RULES_PREVIEW,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
      options: {
        tags: [routeLimitedConcurrencyTag(MAX_ROUTE_CONCURRENCY)],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(RulePreviewRequestBody),
            query: buildRouteValidationWithZod(RulePreviewRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<RulePreviewResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateCreateRuleProps(request.body);
        const coreContext = await context.core;
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }
        try {
          const [coreStart, { data, security: securityService, share, dataViews }] =
            await getStartServices();
          const searchSourceClientWithCps = await data.search.searchSource.asScoped(request, {
            projectRouting: 'space',
          });
          const scopedClusterClientWithCps = coreStart.elasticsearch.client.asScoped(request, {
            projectRouting: 'space',
          });
          const savedObjectsClient = coreContext.savedObjects.client;
          const siemClient = (await context.securitySolution).getAppClient();
          const actionsClient = (await context.actions).getActionsClient();

          const timeframeEnd = request.body.timeframeEnd;
          let invocationCount = request.body.invocationCount;
          if (invocationCount < 1) {
            return response.ok({
              body: {
                logs: [{ errors: ['Invalid invocation count'], warnings: [], duration: 0 }],
                previewId: undefined,
                isAborted: undefined,
              },
            });
          }

          const internalRule = convertRuleResponseToAlertingRule(
            applyRuleDefaults(request.body),
            actionsClient
          );
          const previewRuleParams = internalRule.params;

          const mlAuthz = buildMlAuthz({
            license: (await context.licensing).license,
            ml,
            request,
            savedObjectsClient,
          });
          throwAuthzError(await mlAuthz.validateRuleType(internalRule.params.type));

          const spaceId = siemClient.getSpaceId();
          const previewId = uuidv4();
          const username = security?.authc.getCurrentUser(request)?.username;
          const previewRuleExecutionLogger = createPreviewRuleExecutionLogger();
          const runState: Record<string, unknown> = {
            isLoggedRequestsEnabled: request.query.enable_logged_requests,
          };
          const logs: RulePreviewLogs[] = [];
          let isAborted = false;

          const { hasAllRequested } = await securityService.authz
            .checkPrivilegesWithRequest(request)
            .atSpace(spaceId, {
              elasticsearch: {
                index: {
                  [`${DEFAULT_PREVIEW_INDEX}-${spaceId}`]: ['read'],
                  [`.internal${DEFAULT_PREVIEW_INDEX}-${spaceId}-*`]: ['read'],
                },
                cluster: [],
              },
            });

          if (!hasAllRequested) {
            return response.ok({
              body: {
                logs: [
                  {
                    errors: [
                      'Missing "read" privileges for the ".preview.alerts-security.alerts" or ".internal.preview.alerts-security.alerts" indices. Without these privileges you cannot use the Rule Preview feature.',
                    ],
                    warnings: [],
                    duration: 0,
                  },
                ],
                previewId: undefined,
                isAborted: undefined,
              },
            });
          }

          // Create the preview index so the Lens histogram can resolve field
          // mappings even when no preview alerts have been generated yet.
          try {
            await previewRuleDataClient.getWriter({ namespace: spaceId });
          } catch (err) {
            logger.warn(`Failed to bootstrap preview index for space "${spaceId}": ${err.message}`);
          }

          const previewRuleTypeWrapper = createSecurityRuleTypeWrapper({
            ...securityRuleTypeOptions,
            ruleDataClient: previewRuleDataClient,
            ruleExecutionLoggerFactory: previewRuleExecutionLogger.factory,
            isPreview: true,
          });

          const executorDeps = {
            previewRuleTypeWrapper,
            internalRule,
            runState,
            timeframeEnd,
            invocationCount,
            previewId,
            username,
            previewRuleExecutionLogger,
            spaceId,
            isServerless,
            logger,
            scopedClusterClient: scopedClusterClientWithCps,
            searchSourceClient: searchSourceClientWithCps,
            savedObjectsClient,
            uiSettingsClient: coreContext.uiSettings.client,
            esClientInternal: coreContext.elasticsearch.client.asInternalUser,
            dataViews,
            share,
            data,
            request,
          };

          let executorResult;

          switch (previewRuleParams.type) {
            case 'query':
              const queryAlertType = createQueryAlertType({
                id: QUERY_RULE_TYPE_ID,
                name: 'Custom Query Rule',
              });
              executorResult = await runRuleExecutors(queryAlertType, previewRuleParams, executorDeps);
              break;
            case 'saved_query':
              const savedQueryAlertType = createQueryAlertType({
                id: SAVED_QUERY_RULE_TYPE_ID,
                name: 'Saved Query Rule',
              });
              executorResult = await runRuleExecutors(savedQueryAlertType, previewRuleParams, executorDeps);
              break;
            case 'threshold':
              const thresholdAlertType = createThresholdAlertType();
              executorResult = await runRuleExecutors(thresholdAlertType, previewRuleParams, executorDeps);
              break;
            case 'threat_match':
              const threatMatchAlertType = createIndicatorMatchAlertType();
              executorResult = await runRuleExecutors(threatMatchAlertType, previewRuleParams, executorDeps);
              break;
            case 'eql':
              const eqlAlertType = createEqlAlertType();
              executorResult = await runRuleExecutors(eqlAlertType, previewRuleParams, executorDeps);
              break;
            case 'esql':
              if (config.experimentalFeatures.esqlRulesDisabled) {
                throw Error('ES|QL rule type is not supported');
              }
              const esqlAlertType = createEsqlAlertType();
              executorResult = await runRuleExecutors(esqlAlertType, previewRuleParams, executorDeps);
              break;
            case 'machine_learning':
              const mlAlertType = createMlAlertType(ml);
              executorResult = await runRuleExecutors(mlAlertType, previewRuleParams, executorDeps);
              break;
            case 'new_terms':
              const newTermsAlertType = createNewTermsAlertType();
              executorResult = await runRuleExecutors(newTermsAlertType, previewRuleParams, executorDeps);
              break;
            default:
              assertUnreachable(previewRuleParams);
          }

          logs.push(...(executorResult?.logs ?? []));
          isAborted = executorResult?.isAborted ?? false;

          // Refreshes alias to ensure index is able to be read before returning
          await coreContext.elasticsearch.client.asInternalUser.indices.refresh(
            {
              index: previewRuleDataClient.indexNameWithNamespace(spaceId),
            },
            { ignore: [404] }
          );

          return response.ok({
            body: {
              previewId,
              logs,
              isAborted,
            },
          });
        } catch (err) {
          const error = transformError(err as Error);
          return siemResponse.error({
            body: {
              errors: [error.message],
            },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
