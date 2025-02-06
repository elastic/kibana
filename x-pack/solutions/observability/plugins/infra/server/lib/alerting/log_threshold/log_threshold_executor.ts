/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { getAlertDetailsUrl } from '@kbn/observability-plugin/common';
import {
  ALERT_CONTEXT,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_GROUP,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import type { ElasticsearchClient, IBasePath } from '@kbn/core/server';
import type {
  ActionGroup,
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
  RuleTypeState,
  RuleExecutorOptions,
} from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import type { ObservabilityLogsAlert } from '@kbn/alerts-as-data-utils';
import type {
  PublicAlertsClient,
  RecoveredAlertData,
} from '@kbn/alerting-plugin/server/alerts_client/types';
import { getEcsGroups, type Group } from '@kbn/alerting-rule-utils';

import { ecsFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/ecs_field_map';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { getChartGroupNames } from '../../../../common/utils/get_chart_group_names';
import type {
  RuleParams,
  CountRuleParams,
  CountCriteria,
  GroupedSearchQueryResponse,
  RatioRuleParams,
  UngroupedSearchQueryResponse,
  ExecutionTimeRange,
  Criterion,
} from '../../../../common/alerting/logs/log_threshold';
import {
  ruleParamsRT,
  AlertStates,
  Comparator,
  getDenominator,
  getNumerator,
  GroupedSearchQueryResponseRT,
  hasGroupBy,
  isOptimizableGroupedThreshold,
  isOptimizedGroupedSearchQueryResponse,
  isRatioRuleParams,
  UngroupedSearchQueryResponseRT,
} from '../../../../common/alerting/logs/log_threshold';
import { getLogsAppAlertUrl } from '../../../../common/formatters/alert_link';
import type { InfraBackendLibs } from '../../infra_types';
import type { AdditionalContext } from '../common/utils';
import {
  flattenAdditionalContext,
  getContextForRecoveredAlerts,
  getGroupByObject,
  unflattenObject,
  UNGROUPED_FACTORY_KEY,
} from '../common/utils';
import {
  getReasonMessageForGroupedCountAlert,
  getReasonMessageForGroupedRatioAlert,
  getReasonMessageForUngroupedCountAlert,
  getReasonMessageForUngroupedRatioAlert,
} from './reason_formatters';
import type { LogThresholdRuleTypeParams } from '../../../../common/alerting/logs/log_threshold/query_helpers';
import {
  buildFiltersFromCriteria,
  positiveComparators,
} from '../../../../common/alerting/logs/log_threshold/query_helpers';

export type LogThresholdActionGroups = ActionGroupIdsOf<typeof FIRED_ACTIONS>;
export type LogThresholdRuleTypeState = RuleTypeState; // no specific state used
export type LogThresholdAlertState = AlertState; // no specific state used
export type LogThresholdAlertContext = AlertContext; // no specific instance context used

export type LogThresholdAlert = Omit<
  ObservabilityLogsAlert,
  'kibana.alert.evaluation.values' | 'kibana.alert.group'
> & {
  // Defining a custom type for this because the schema generation script doesn't allow explicit null values
  'kibana.alert.evaluation.values'?: Array<number | null>;
  [ALERT_GROUP]?: Group[];
};

export type LogThresholdAlertReporter = (
  id: string,
  reason: string,
  value: number,
  threshold: number,
  actions?: Array<{ actionGroup: LogThresholdActionGroups; context: AlertContext }>,
  rootLevelContext?: AdditionalContext
) => void;

const COMPOSITE_GROUP_SIZE = 2000;

const checkValueAgainstComparatorMap: {
  [key: string]: (a: number, b: number) => boolean;
} = {
  [Comparator.GT]: (a: number, b: number) => a > b,
  [Comparator.GT_OR_EQ]: (a: number, b: number) => a >= b,
  [Comparator.LT]: (a: number, b: number) => a < b,
  [Comparator.LT_OR_EQ]: (a: number, b: number) => a <= b,
};

// The executor execution roughly follows a pattern of:
// ES Query generation -> fetching of results -> processing of results.
// With forks for group_by vs ungrouped, and ratio vs non-ratio.

export const createLogThresholdExecutor =
  (libs: InfraBackendLibs) =>
  async (
    options: RuleExecutorOptions<
      LogThresholdRuleTypeParams,
      LogThresholdRuleTypeState,
      LogThresholdAlertState,
      LogThresholdAlertContext,
      LogThresholdActionGroups,
      LogThresholdAlert
    >
  ) => {
    const { services, params, spaceId, startedAt } = options;
    const { basePath } = libs;
    const { alertsClient, savedObjectsClient, scopedClusterClient } = services;
    if (!alertsClient) {
      throw new AlertsClientError();
    }

    const alertReporter: LogThresholdAlertReporter = async (
      id,
      reason,
      value,
      threshold,
      actions,
      rootLevelContext
    ) => {
      const alertContext =
        actions != null
          ? actions.reduce((next, action) => Object.assign(next, action.context), {})
          : {};

      if (actions && actions.length > 0) {
        actions.forEach((actionSet) => {
          const { actionGroup, context: actionContext } = actionSet;
          const alertInstanceId = (actionContext.group || id) as string;
          const { uuid, start } = alertsClient.report({
            id: alertInstanceId,
            actionGroup,
            state: {
              alertState: AlertStates.ALERT,
            },
          });
          const indexedStartedAt = start ?? startedAt.toISOString();
          const relativeViewInAppUrl = getLogsAppAlertUrl(new Date(indexedStartedAt).getTime());
          const viewInAppUrl = addSpaceIdToPath(
            basePath.publicBaseUrl,
            spaceId,
            relativeViewInAppUrl
          );

          const context = {
            ...actionContext,
            timestamp: startedAt.toISOString(),
            viewInAppUrl,
            alertDetailsUrl: getAlertDetailsUrl(libs.basePath, spaceId, uuid),
          };

          const instances = alertInstanceId.split(',');
          const groups =
            alertInstanceId !== '*'
              ? params.groupBy?.reduce<Group[]>((resultGroups, groupByItem, index) => {
                  resultGroups.push({ field: groupByItem, value: instances[index].trim() });
                  return resultGroups;
                }, [])
              : undefined;

          const payload = {
            [ALERT_EVALUATION_THRESHOLD]: threshold,
            [ALERT_EVALUATION_VALUE]: value,
            [ALERT_REASON]: reason,
            [ALERT_CONTEXT]: alertContext,
            [ALERT_GROUP]: groups,
            ...flattenAdditionalContext(rootLevelContext),
            ...getEcsGroups(groups),
          };

          alertsClient.setAlertData({
            id: alertInstanceId,
            payload,
            context,
          });
        });
      }
    };

    const [, { logsShared, logsDataAccess }] = await libs.getStartServices();

    try {
      const validatedParams = decodeOrThrow(ruleParamsRT)(params);

      const logSourcesService =
        logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(savedObjectsClient);

      const { indices, timestampField, runtimeMappings } = await logsShared.logViews
        .getClient(savedObjectsClient, scopedClusterClient.asCurrentUser, logSourcesService)
        .getResolvedLogView(validatedParams.logView);

      if (!isRatioRuleParams(validatedParams)) {
        await executeAlert(
          validatedParams,
          timestampField,
          indices,
          runtimeMappings,
          scopedClusterClient.asCurrentUser,
          alertReporter,
          alertsClient,
          startedAt.valueOf()
        );
      } else {
        await executeRatioAlert(
          validatedParams,
          timestampField,
          indices,
          runtimeMappings,
          scopedClusterClient.asCurrentUser,
          alertReporter,
          alertsClient,
          startedAt.valueOf()
        );
      }

      const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];
      processRecoveredAlerts({
        alertsClient,
        basePath,
        recoveredAlerts,
        spaceId,
        startedAt,
        validatedParams,
      });
    } catch (e) {
      throw new Error(e);
    }

    return { state: {} };
  };

export async function executeAlert(
  ruleParams: CountRuleParams,
  timestampField: string,
  indexPattern: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  esClient: ElasticsearchClient,
  alertReporter: LogThresholdAlertReporter,
  alertsClient: PublicAlertsClient<
    LogThresholdAlert,
    AlertState,
    AlertContext,
    LogThresholdActionGroups
  >,
  executionTimestamp: number
) {
  const query = getESQuery(
    ruleParams,
    timestampField,
    indexPattern,
    runtimeMappings,
    executionTimestamp
  );

  if (!query) {
    throw new Error('ES query could not be built from the provided alert params');
  }

  if (hasGroupBy(ruleParams)) {
    processGroupByResults(
      await getGroupedResults(query, esClient),
      ruleParams,
      alertReporter,
      alertsClient
    );
  } else {
    processUngroupedResults(
      await getUngroupedResults(query, esClient),
      ruleParams,
      alertReporter,
      alertsClient
    );
  }
}

export async function executeRatioAlert(
  ruleParams: RatioRuleParams,
  timestampField: string,
  indexPattern: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  esClient: ElasticsearchClient,
  alertReporter: LogThresholdAlertReporter,
  alertsClient: PublicAlertsClient<
    LogThresholdAlert,
    AlertState,
    AlertContext,
    LogThresholdActionGroups
  >,
  executionTimestamp: number
) {
  // Ratio alert params are separated out into two standard sets of alert params
  const numeratorParams: RuleParams = {
    ...ruleParams,
    criteria: getNumerator(ruleParams.criteria),
  };

  const denominatorParams: RuleParams = {
    ...ruleParams,
    criteria: getDenominator(ruleParams.criteria),
  };

  const numeratorQuery = getESQuery(
    numeratorParams,
    timestampField,
    indexPattern,
    runtimeMappings,
    executionTimestamp
  );
  const denominatorQuery = getESQuery(
    denominatorParams,
    timestampField,
    indexPattern,
    runtimeMappings,
    executionTimestamp
  );

  if (!numeratorQuery || !denominatorQuery) {
    throw new Error('ES query could not be built from the provided ratio alert params');
  }

  if (hasGroupBy(ruleParams)) {
    const [numeratorGroupedResults, denominatorGroupedResults] = await Promise.all([
      getGroupedResults(numeratorQuery, esClient),
      getGroupedResults(denominatorQuery, esClient),
    ]);
    processGroupByRatioResults(
      numeratorGroupedResults,
      denominatorGroupedResults,
      ruleParams,
      alertReporter,
      alertsClient
    );
  } else {
    const [numeratorUngroupedResults, denominatorUngroupedResults] = await Promise.all([
      getUngroupedResults(numeratorQuery, esClient),
      getUngroupedResults(denominatorQuery, esClient),
    ]);
    processUngroupedRatioResults(
      numeratorUngroupedResults,
      denominatorUngroupedResults,
      ruleParams,
      alertReporter,
      alertsClient
    );
  }
}

const getESQuery = (
  alertParams: Omit<RuleParams, 'criteria'> & { criteria: CountCriteria },
  timestampField: string,
  indexPattern: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  executionTimestamp: number
) => {
  const executionTimeRange = {
    lte: executionTimestamp,
  };
  return hasGroupBy(alertParams)
    ? getGroupedESQuery(
        alertParams,
        timestampField,
        indexPattern,
        runtimeMappings,
        executionTimeRange
      )
    : getUngroupedESQuery(
        alertParams,
        timestampField,
        indexPattern,
        runtimeMappings,
        executionTimeRange
      );
};

export const processUngroupedResults = (
  results: UngroupedSearchQueryResponse,
  params: CountRuleParams,
  alertReporter: LogThresholdAlertReporter,
  alertsClient: PublicAlertsClient<
    LogThresholdAlert,
    AlertState,
    AlertContext,
    LogThresholdActionGroups
  >
) => {
  const { count, criteria, timeSize, timeUnit } = params;
  const documentCount = results.hits.total.value;
  const additionalContextHits = results.aggregations?.additionalContext?.hits?.hits;
  const additionalContext = formatFields(additionalContextHits?.[0]?.fields);
  const reasonMessage = getReasonMessageForUngroupedCountAlert(
    documentCount,
    count.value,
    count.comparator,
    timeSize,
    timeUnit
  );

  if (checkValueAgainstComparatorMap[count.comparator](documentCount, count.value)) {
    const actions = [
      {
        actionGroup: FIRED_ACTIONS.id,
        context: {
          matchingDocuments: documentCount,
          conditions: createConditionsMessageForCriteria(criteria),
          group: null,
          isRatio: false,
          reason: reasonMessage,
          ...additionalContext,
        },
      },
    ];
    alertReporter(
      UNGROUPED_FACTORY_KEY,
      reasonMessage,
      documentCount,
      count.value,
      actions,
      additionalContext
    );
    alertsClient.setAlertLimitReached(alertsClient.getAlertLimitValue() <= 1);
  } else {
    alertsClient.setAlertLimitReached(false);
  }
};

export const processUngroupedRatioResults = (
  numeratorResults: UngroupedSearchQueryResponse,
  denominatorResults: UngroupedSearchQueryResponse,
  params: RatioRuleParams,
  alertReporter: LogThresholdAlertReporter,
  alertsClient: PublicAlertsClient<
    LogThresholdAlert,
    AlertState,
    AlertContext,
    LogThresholdActionGroups
  >
) => {
  const { count, criteria, timeSize, timeUnit } = params;

  const numeratorCount = numeratorResults.hits.total.value;
  const denominatorCount = denominatorResults.hits.total.value;
  const additionalContextHits = numeratorResults.aggregations?.additionalContext?.hits?.hits;
  const additionalContext = formatFields(additionalContextHits?.[0]?.fields);
  const ratio = getRatio(numeratorCount, denominatorCount);

  if (ratio !== undefined && checkValueAgainstComparatorMap[count.comparator](ratio, count.value)) {
    const reasonMessage = getReasonMessageForUngroupedRatioAlert(
      ratio,
      count.value,
      count.comparator,
      timeSize,
      timeUnit
    );
    const actions = [
      {
        actionGroup: FIRED_ACTIONS.id,
        context: {
          ratio,
          numeratorConditions: createConditionsMessageForCriteria(getNumerator(criteria)),
          denominatorConditions: createConditionsMessageForCriteria(getDenominator(criteria)),
          group: null,
          isRatio: true,
          reason: reasonMessage,
          ...additionalContext,
        },
      },
    ];
    alertReporter(
      UNGROUPED_FACTORY_KEY,
      reasonMessage,
      ratio,
      count.value,
      actions,
      additionalContext
    );
    alertsClient.setAlertLimitReached(alertsClient.getAlertLimitValue() <= 1);
  } else {
    alertsClient.setAlertLimitReached(false);
  }
};

const getRatio = (numerator: number, denominator: number) => {
  // We follow the mathematics principle that dividing by 0 isn't possible,
  // and a ratio is therefore undefined (or indeterminate).
  if (numerator === 0 || denominator === 0) return undefined;
  return numerator / denominator;
};

interface ReducedGroupByResult {
  name: string;
  documentCount: number;
  context?: AdditionalContext;
}

type ReducedGroupByResults = ReducedGroupByResult[];

const getReducedGroupByResults = (
  results: GroupedSearchQueryResponse['aggregations']['groups']['buckets']
): ReducedGroupByResults => {
  const getGroupName = (
    key: GroupedSearchQueryResponse['aggregations']['groups']['buckets'][0]['key']
  ) => getChartGroupNames(Object.values(key));

  const reducedGroupByResults: ReducedGroupByResults = [];
  if (isOptimizedGroupedSearchQueryResponse(results)) {
    for (const groupBucket of results) {
      const groupName = getGroupName(groupBucket.key);
      const additionalContextHits = groupBucket.additionalContext?.hits?.hits;
      reducedGroupByResults.push({
        name: groupName,
        documentCount: groupBucket.doc_count,
        context: formatFields(additionalContextHits?.[0]?.fields),
      });
    }
  } else {
    for (const groupBucket of results) {
      const groupName = getGroupName(groupBucket.key);
      const additionalContextHits = groupBucket.filtered_results.additionalContext?.hits?.hits;
      reducedGroupByResults.push({
        name: groupName,
        documentCount: groupBucket.filtered_results.doc_count,
        context: formatFields(additionalContextHits?.[0]?.fields),
      });
    }
  }
  return reducedGroupByResults;
};

export const processGroupByResults = (
  results: GroupedSearchQueryResponse['aggregations']['groups']['buckets'],
  params: CountRuleParams,
  alertReporter: LogThresholdAlertReporter,
  alertsClient: PublicAlertsClient<
    LogThresholdAlert,
    AlertState,
    AlertContext,
    LogThresholdActionGroups
  >
) => {
  const { count, criteria, timeSize, timeUnit } = params;

  const groupResults = getReducedGroupByResults(results);

  let remainingAlertCount = alertsClient.getAlertLimitValue();

  for (const group of groupResults) {
    if (remainingAlertCount <= 0) {
      break;
    }

    const documentCount = group.documentCount;

    if (checkValueAgainstComparatorMap[count.comparator](documentCount, count.value)) {
      remainingAlertCount -= 1;
      const reasonMessage = getReasonMessageForGroupedCountAlert(
        documentCount,
        count.value,
        count.comparator,
        group.name,
        timeSize,
        timeUnit
      );

      const groupByKeysObjectMapping = getGroupByObject(
        params.groupBy,
        new Set<string>(groupResults.map((groupResult) => groupResult.name))
      );

      const actions = [
        {
          actionGroup: FIRED_ACTIONS.id,
          context: {
            matchingDocuments: documentCount,
            conditions: createConditionsMessageForCriteria(criteria),
            group: group.name,
            groupByKeys: groupByKeysObjectMapping[group.name],
            isRatio: false,
            reason: reasonMessage,
            ...group.context,
          },
        },
      ];
      alertReporter(group.name, reasonMessage, documentCount, count.value, actions, group.context);
    }
  }

  alertsClient.setAlertLimitReached(remainingAlertCount <= 0);
};

export const processGroupByRatioResults = (
  numeratorResults: GroupedSearchQueryResponse['aggregations']['groups']['buckets'],
  denominatorResults: GroupedSearchQueryResponse['aggregations']['groups']['buckets'],
  params: RatioRuleParams,
  alertReporter: LogThresholdAlertReporter,
  alertsClient: PublicAlertsClient<
    LogThresholdAlert,
    AlertState,
    AlertContext,
    LogThresholdActionGroups
  >
) => {
  const { count, criteria, timeSize, timeUnit } = params;

  const numeratorGroupResults = getReducedGroupByResults(numeratorResults);
  const denominatorGroupResults = getReducedGroupByResults(denominatorResults);

  let remainingAlertCount = alertsClient.getAlertLimitValue();

  for (const numeratorGroup of numeratorGroupResults) {
    if (remainingAlertCount <= 0) {
      break;
    }

    const numeratorDocumentCount = numeratorGroup.documentCount;
    const denominatorGroup = denominatorGroupResults.find(
      (_group) => _group.name === numeratorGroup.name
    );
    // If there is no matching group, a ratio cannot be determined, and is therefore undefined.
    const ratio = denominatorGroup
      ? getRatio(numeratorDocumentCount, denominatorGroup.documentCount)
      : undefined;
    if (
      ratio !== undefined &&
      checkValueAgainstComparatorMap[count.comparator](ratio, count.value)
    ) {
      remainingAlertCount -= 1;
      const reasonMessage = getReasonMessageForGroupedRatioAlert(
        ratio,
        count.value,
        count.comparator,
        numeratorGroup.name,
        timeSize,
        timeUnit
      );

      const groupByKeysObjectMapping = getGroupByObject(
        params.groupBy,
        new Set<string>(numeratorGroupResults.map((groupResult) => groupResult.name))
      );

      const actions = [
        {
          actionGroup: FIRED_ACTIONS.id,
          context: {
            ratio,
            numeratorConditions: createConditionsMessageForCriteria(getNumerator(criteria)),
            denominatorConditions: createConditionsMessageForCriteria(getDenominator(criteria)),
            group: numeratorGroup.name,
            groupByKeys: groupByKeysObjectMapping[numeratorGroup.name],
            isRatio: true,
            reason: reasonMessage,
            ...numeratorGroup.context,
          },
        },
      ];
      alertReporter(
        numeratorGroup.name,
        reasonMessage,
        ratio,
        count.value,
        actions,
        numeratorGroup.context
      );
    }
  }

  alertsClient.setAlertLimitReached(remainingAlertCount <= 0);
};

export const getGroupedESQuery = (
  params: Pick<RuleParams, 'timeSize' | 'timeUnit' | 'groupBy'> & {
    criteria: CountCriteria;
    count: {
      comparator: RuleParams['count']['comparator'];
      value?: RuleParams['count']['value'];
    };
  },
  timestampField: string,
  index: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  executionTimeRange?: ExecutionTimeRange
): estypes.SearchRequest | undefined => {
  // IMPORTANT:
  // For the group by scenario we need to account for users utilizing "less than" configurations
  // to attempt to match on "0", e.g. something has stopped reporting. We need to cast a wider net for these
  // configurations to try and capture more documents, so that the filtering doesn't make the group "disappear".
  // Due to this there are two forks in the group by code, one where we can optimize the filtering early, and one where
  // it is an inner aggregation. "Less than" configurations with high cardinality group by fields can cause severe performance
  // problems.

  const {
    groupBy,
    count: { comparator, value },
  } = params;

  if (!groupBy || !groupBy.length) {
    return;
  }

  const { rangeFilter, groupedRangeFilter, mustFilters, mustNotFilters } = buildFiltersFromCriteria(
    params,
    timestampField,
    executionTimeRange
  );

  if (isOptimizableGroupedThreshold(comparator, value)) {
    const aggregations = {
      groups: {
        composite: {
          size: COMPOSITE_GROUP_SIZE,
          sources: groupBy.map((field, groupIndex) => ({
            [`group-${groupIndex}-${field}`]: {
              terms: { field },
            },
          })),
        },
        aggregations: {
          ...getContextAggregation(params),
        },
      },
    };

    const body: estypes.SearchRequest['body'] = {
      query: {
        bool: {
          filter: [rangeFilter, ...mustFilters],
          ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
        },
      },
      aggregations,
      runtime_mappings: runtimeMappings,
      size: 0,
    };

    return {
      index,
      allow_no_indices: true,
      ignore_unavailable: true,
      body,
    };
  } else {
    const aggregations = {
      groups: {
        composite: {
          size: COMPOSITE_GROUP_SIZE,
          sources: groupBy.map((field, groupIndex) => ({
            [`group-${groupIndex}-${field}`]: {
              terms: { field },
            },
          })),
        },
        aggregations: {
          filtered_results: {
            filter: {
              bool: {
                // Scope the inner filtering back to the unpadded range
                filter: [rangeFilter, ...mustFilters],
                ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
              },
            },
            aggregations: {
              ...getContextAggregation(params),
            },
          },
        },
      },
    };

    const body: estypes.SearchRequest['body'] = {
      query: {
        bool: {
          filter: [groupedRangeFilter],
        },
      },
      aggregations,
      runtime_mappings: runtimeMappings,
      size: 0,
    };

    return {
      index,
      allow_no_indices: true,
      ignore_unavailable: true,
      body,
    };
  }
};

export const getUngroupedESQuery = (
  params: Pick<RuleParams, 'timeSize' | 'timeUnit'> & { criteria: CountCriteria },
  timestampField: string,
  index: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  executionTimeRange?: ExecutionTimeRange
): object => {
  const { rangeFilter, mustFilters, mustNotFilters } = buildFiltersFromCriteria(
    params,
    timestampField,
    executionTimeRange
  );

  const body: estypes.SearchRequest['body'] = {
    // Ensure we accurately track the hit count for the ungrouped case, otherwise we can only ensure accuracy up to 10,000.
    track_total_hits: true,
    query: {
      bool: {
        filter: [rangeFilter, ...mustFilters],
        ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
      },
    },
    aggregations: {
      ...getContextAggregation(params),
    },
    runtime_mappings: runtimeMappings,
    size: 0,
  };

  return {
    index,
    allow_no_indices: true,
    ignore_unavailable: true,
    body,
  };
};

const getUngroupedResults = async (query: object, esClient: ElasticsearchClient) => {
  return decodeOrThrow(UngroupedSearchQueryResponseRT)(await esClient.search(query));
};

const getGroupedResults = async (query: object, esClient: ElasticsearchClient) => {
  let compositeGroupBuckets: GroupedSearchQueryResponse['aggregations']['groups']['buckets'] = [];
  let lastAfterKey: GroupedSearchQueryResponse['aggregations']['groups']['after_key'] | undefined;

  while (true) {
    const queryWithAfterKey: any = { ...query };
    queryWithAfterKey.body.aggregations.groups.composite.after = lastAfterKey;
    const groupResponse: GroupedSearchQueryResponse = decodeOrThrow(GroupedSearchQueryResponseRT)(
      await esClient.search(queryWithAfterKey)
    );
    compositeGroupBuckets = [
      ...compositeGroupBuckets,
      ...groupResponse.aggregations.groups.buckets,
    ];
    lastAfterKey = groupResponse.aggregations.groups.after_key;
    if (groupResponse.aggregations.groups.buckets.length < COMPOSITE_GROUP_SIZE) {
      break;
    }
  }

  return compositeGroupBuckets;
};

const processRecoveredAlerts = ({
  alertsClient,
  basePath,
  recoveredAlerts,
  spaceId,
  startedAt,
  validatedParams,
}: {
  alertsClient: PublicAlertsClient<
    LogThresholdAlert,
    AlertState,
    AlertContext,
    LogThresholdActionGroups
  >;
  basePath: IBasePath;
  recoveredAlerts: Array<
    RecoveredAlertData<LogThresholdAlert, AlertState, AlertContext, LogThresholdActionGroups>
  >;
  spaceId: string;
  startedAt: Date;
  validatedParams: RuleParams;
}) => {
  const groupByKeysObjectForRecovered = getGroupByObject(
    validatedParams.groupBy,
    new Set<string>(recoveredAlerts.map((recoveredAlert) => recoveredAlert.alert.getId()))
  );

  for (const recoveredAlert of recoveredAlerts) {
    const recoveredAlertId = recoveredAlert.alert.getId();
    const indexedStartedAt = recoveredAlert.alert.getStart() ?? startedAt.toISOString();
    const relativeViewInAppUrl = getLogsAppAlertUrl(new Date(indexedStartedAt).getTime());
    const alertUuid = recoveredAlert.alert.getUuid();
    const alertHits = recoveredAlert.hit;
    const additionalContext = getContextForRecoveredAlerts(alertHits);
    const viewInAppUrl = addSpaceIdToPath(basePath.publicBaseUrl, spaceId, relativeViewInAppUrl);

    const baseContext = {
      alertDetailsUrl: getAlertDetailsUrl(basePath, spaceId, alertUuid),
      group: hasGroupBy(validatedParams) ? recoveredAlertId : null,
      groupByKeys: groupByKeysObjectForRecovered[recoveredAlertId],
      timestamp: startedAt.toISOString(),
      viewInAppUrl,
      ...additionalContext,
    };

    if (isRatioRuleParams(validatedParams)) {
      const { criteria } = validatedParams;

      const context = {
        ...baseContext,
        numeratorConditions: createConditionsMessageForCriteria(getNumerator(criteria)),
        denominatorConditions: createConditionsMessageForCriteria(getDenominator(criteria)),
        isRatio: true,
      };
      alertsClient.setAlertData({ id: recoveredAlertId, context });
    } else {
      const { criteria } = validatedParams;

      const context = {
        ...baseContext,
        conditions: createConditionsMessageForCriteria(criteria),
        isRatio: false,
      };
      alertsClient.setAlertData({ id: recoveredAlertId, context });
    }
  }
};

const createConditionsMessageForCriteria = (criteria: CountCriteria) =>
  criteria
    .map((criterion) => {
      const { field, comparator, value } = criterion;
      return `${field} ${comparator} ${value}`;
    })
    .join(' and ');

// When the Alerting plugin implements support for multiple action groups, add additional
// action groups here to send different messages, e.g. a recovery notification
export const LogsThresholdFiredActionGroupId = 'logs.threshold.fired';
export const FIRED_ACTIONS: ActionGroup<'logs.threshold.fired'> = {
  id: LogsThresholdFiredActionGroupId,
  name: i18n.translate('xpack.infra.logs.alerting.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};

const getContextAggregation = (
  params: Pick<RuleParams, 'groupBy'> & { criteria: CountCriteria }
) => {
  const validPrefixForContext = ['host', 'cloud', 'orchestrator', 'container', 'labels', 'tags'];
  const positiveCriteria = params.criteria.filter((criterion: Criterion) =>
    positiveComparators.includes(criterion.comparator)
  );

  const fieldsFromGroupBy = params.groupBy
    ? getFieldsSet(params.groupBy, validPrefixForContext)
    : new Set<string>();
  const fieldsFromCriteria = getFieldsSet(
    positiveCriteria.map((criterion: Criterion) => criterion.field),
    validPrefixForContext
  );
  const fieldsPrefixList = Array.from(
    new Set<string>([...fieldsFromGroupBy, ...fieldsFromCriteria])
  );
  const fieldsList = fieldsPrefixList.map((prefix) => (prefix === 'tags' ? prefix : `${prefix}.*`));

  const additionalContextAgg =
    fieldsList.length > 0
      ? {
          additionalContext: {
            top_hits: {
              size: 1,
              fields: fieldsList,
              _source: false,
            },
          },
        }
      : null;

  return additionalContextAgg;
};

const getFieldsSet = (groupBy: string[] | undefined, validPrefix: string[]): Set<string> => {
  return new Set<string>(
    groupBy
      ?.map((currentGroupBy) => currentGroupBy.split('.')[0])
      .filter((groupByPrefix) => validPrefix.includes(groupByPrefix))
  );
};

const fieldsToExclude = ['disk', 'network', 'cpu', 'memory'];

const formatFields = (
  contextFields: AdditionalContext | undefined
): AdditionalContext | undefined => {
  if (!contextFields) return undefined;
  const formattedContextFields: Record<string, any> = {};

  Object.entries(contextFields).forEach(([key, value]) => {
    if (key in ecsFieldMap && !excludeField(key)) {
      formattedContextFields[key] = ecsFieldMap[key as keyof typeof ecsFieldMap].array
        ? value
        : value?.[0];
    }
  });

  return unflattenObject(formattedContextFields);
};

const excludeField = (key: string): boolean => {
  return fieldsToExclude.includes(key.split('.')?.[1]);
};
