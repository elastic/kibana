/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import type { RuleTypeState } from '@kbn/alerting-plugin/common';
import { parseDuration, DISABLE_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAction,
} from '@kbn/alerting-plugin/common';
import type {
  IScopedClusterClient,
  SavedObjectsClientContract,
  IUiSettingsClient,
  Logger,
  ElasticsearchClient,
} from '@kbn/core/server';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { DataPluginStart } from '@kbn/data-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { wrapAsyncSearchClient } from '@kbn/alerting-plugin/server/lib';

import { SERVER_APP_ID } from '../../../../../../common/constants';
import { RuleExecutionStatusEnum } from '../../../../../../common/api/detection_engine/rule_monitoring';
import type { RulePreviewLogs } from '../../../../../../common/api/detection_engine';
import type { RulePreviewLoggedRequest } from '../../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';

import type { RuleParams } from '../../../rule_schema';
import type { SecurityAlertType } from '../../../rule_types/types';
import { parseInterval } from '../../../rule_types/utils/utils';
import { alertInstanceFactoryStub } from './alert_instance_factory_stub';
import { wrapScopedClusterClient } from './wrap_scoped_cluster_client';
import { wrapSearchSourceClient } from './wrap_search_source_client';

const PREVIEW_TIMEOUT_SECONDS = 60;

/** All the dependencies that `runExecutors` captures from the route handler scope. */
export interface RunRuleExecutorsDeps {
  /** The rule type wrapper that adds preview instrumentation. */
  previewRuleTypeWrapper: (
    ruleType: SecurityAlertType<any, any>
  ) => SecurityAlertType<any, any>;
  /** The converted internal rule (from `convertRuleResponseToAlertingRule`). */
  internalRule: {
    schedule: { interval: string };
    actions: RuleAction[];
    [key: string]: unknown;
  };
  /** Initial state for the executor (e.g. `{ isLoggedRequestsEnabled }` ). */
  runState: Record<string, unknown>;
  /** End of the preview timeframe (from request body). */
  timeframeEnd: string;
  /** Number of invocations to run. */
  invocationCount: number;
  /** Preview UUID for this run. */
  previewId: string;
  /** Username of the requesting user. */
  username: string | undefined;
  /** Preview rule execution logger. */
  previewRuleExecutionLogger: {
    getExecutionResult: () => { status: string; message: string } | undefined;
    getErrors: () => string[];
    getWarnings: () => string[];
  };
  /** Space ID. */
  spaceId: string;
  /** Whether the instance is serverless. */
  isServerless: boolean;
  /** Logger. */
  logger: Logger;

  // ── Service deps ────────────────────────────────────────────────

  /** Scoped cluster client (with CPS routing). */
  scopedClusterClient: IScopedClusterClient;
  /** Search source client (with CPS routing). */
  searchSourceClient: ISearchStartSearchSource;
  /** Saved objects client. */
  savedObjectsClient: SavedObjectsClientContract;
  /** UI settings client. */
  uiSettingsClient: IUiSettingsClient;
  /** Internal ES client (for data views). */
  esClientInternal: ElasticsearchClient;
  /** Data views service factory. */
  dataViews: DataViewsServerPluginStart;
  /** Share plugin start. */
  share: SharePluginStart;
  /** Data plugin start. */
  data: DataPluginStart;
  /** The original request (needed for async search client). */
  request: KibanaRequest;
}

export interface RunRuleExecutorsResult {
  logs: RulePreviewLogs[];
  isAborted: boolean;
}

/**
 * Run the rule preview executor loop for a single rule type.
 *
 * Extracted from the preview route handler so it can be called
 * programmatically — e.g. from the detection emulation scenario
 * orchestrator to validate that injected logs would actually
 * trigger a detection rule.
 */
export async function runRuleExecutors<
  TParams extends RuleParams,
  TState extends RuleTypeState,
>(
  securityRuleType: SecurityAlertType<TParams, TState>,
  params: TParams,
  deps: RunRuleExecutorsDeps
): Promise<RunRuleExecutorsResult> {
  const {
    previewRuleTypeWrapper,
    internalRule,
    runState,
    timeframeEnd,
    previewId,
    username,
    previewRuleExecutionLogger,
    spaceId,
    isServerless,
    logger,
    scopedClusterClient,
    searchSourceClient,
    savedObjectsClient,
    uiSettingsClient,
    esClientInternal,
    dataViews,
    share,
    data,
    request,
  } = deps;

  let { invocationCount } = deps;
  const logs: RulePreviewLogs[] = [];
  let isAborted = false;

  const ruleType = previewRuleTypeWrapper(securityRuleType);
  let statePreview = runState as TState;
  let loggedRequests: RulePreviewLoggedRequest[] = [];

  const abortController = new AbortController();
  setTimeout(() => {
    abortController.abort();
    isAborted = true;
  }, PREVIEW_TIMEOUT_SECONDS * 1000);

  const startedAt = moment(timeframeEnd);
  const parsedDuration = parseDuration(internalRule.schedule.interval) ?? 0;
  startedAt.subtract(moment.duration(parsedDuration * (invocationCount - 1)));

  let previousStartedAt = null;

  const rule = {
    ...internalRule,
    id: previewId,
    createdAt: new Date(),
    createdBy: username ?? 'preview-created-by',
    producer: 'preview-producer',
    consumer: SERVER_APP_ID,
    enabled: true,
    revision: 0,
    ruleTypeId: ruleType.id,
    ruleTypeName: ruleType.name,
    updatedAt: new Date(),
    updatedBy: username ?? 'preview-updated-by',
    muteAll: false,
    snoozeSchedule: [],
    actions: internalRule.actions as RuleAction[],
  };

  let invocationStartTime;

  const dataViewsService = await dataViews.dataViewsServiceFactory(
    savedObjectsClient,
    esClientInternal
  );

  while (invocationCount > 0 && !isAborted) {
    invocationStartTime = moment();

    ({ state: statePreview, loggedRequests } = (await ruleType.executor({
      executionId: uuidv4(),
      params,
      previousStartedAt,
      rule,
      services: {
        shouldWriteAlerts: () => true,
        shouldStopExecution: () => isAborted,
        alertsClient: null,
        alertFactory: {
          create: alertInstanceFactoryStub<
            TParams,
            TState,
            AlertInstanceState,
            AlertInstanceContext,
            'default'
          >,
          alertLimit: {
            getValue: () => 1000,
            setLimitReached: () => {},
          },
          done: () => ({ getRecoveredAlerts: () => [] }),
        },
        savedObjectsClient,
        scopedClusterClient: wrapScopedClusterClient({
          abortController,
          scopedClusterClient,
        }),
        getSearchSourceClient: async () =>
          wrapSearchSourceClient({
            abortController,
            searchSourceClient,
          }),
        getMaintenanceWindowIds: async () => [],
        getMaintenanceWindowNames: async () => [],
        uiSettingsClient,
        getDataViews: async () => dataViewsService,
        share,
        getAsyncSearchClient: (strategy) => {
          const clientWithCps = data.search.asScoped(request, {
            projectRouting: 'space',
          });
          return wrapAsyncSearchClient({
            rule: {
              name: rule.name as string,
              id: rule.id,
              alertTypeId: rule.ruleTypeId,
              spaceId,
            },
            logger,
            strategy,
            client: clientWithCps,
            abortController,
          });
        },
      },
      spaceId,
      startedAt: startedAt.toDate(),
      startedAtOverridden: true,
      state: statePreview,
      logger,
      flappingSettings: DISABLE_FLAPPING_SETTINGS,
      getTimeRange: () => {
        const date = startedAt.toISOString();
        return { dateStart: date, dateEnd: date };
      },
      isServerless,
      ruleExecutionTimeout: `${PREVIEW_TIMEOUT_SECONDS}s`,
    })) as { state: TState; loggedRequests: RulePreviewLoggedRequest[] });

    const executionResult = previewRuleExecutionLogger.getExecutionResult();

    logs.push({
      errors:
        executionResult?.status === RuleExecutionStatusEnum.failed
          ? [executionResult?.message, ...previewRuleExecutionLogger.getErrors()]
          : previewRuleExecutionLogger.getErrors(),
      warnings:
        executionResult?.status === RuleExecutionStatusEnum['partial failure']
          ? [executionResult?.message, ...previewRuleExecutionLogger.getWarnings()]
          : previewRuleExecutionLogger.getWarnings(),
      startedAt: startedAt.toDate().toISOString(),
      duration: moment().diff(invocationStartTime, 'milliseconds'),
      ...(loggedRequests ? { requests: loggedRequests } : {}),
    });

    if (executionResult?.status === RuleExecutionStatusEnum.failed) {
      break;
    }

    previousStartedAt = startedAt.toDate();
    startedAt.add(parseInterval(internalRule.schedule.interval));
    invocationCount--;
  }

  return { logs, isAborted };
}
