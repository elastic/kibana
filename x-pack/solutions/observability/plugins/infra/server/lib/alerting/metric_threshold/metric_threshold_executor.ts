/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUES,
  ALERT_GROUP,
  ALERT_GROUPING,
  ALERT_INDEX_PATTERN,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { castArray, isEqual } from 'lodash';
import type {
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '@kbn/alerting-plugin/common';
import { RecoveredActionGroup } from '@kbn/alerting-plugin/common';
import type { RuleExecutorOptions, RuleTypeState } from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { TimeUnitChar } from '@kbn/observability-plugin/common';
import { getAlertDetailsUrl } from '@kbn/observability-plugin/common';
import type { ObservabilityMetricsAlert } from '@kbn/alerts-as-data-utils';
import type { COMPARATORS } from '@kbn/alerting-comparators';
import {
  getEcsGroupsFromFlattenGrouping,
  unflattenGrouping,
  getFlattenGrouping,
  type Group,
  getFormattedGroups,
} from '@kbn/alerting-rule-utils';
import { convertToBuiltInComparators } from '@kbn/observability-plugin/common/utils/convert_legacy_outside_comparator';
import { getOriginalActionGroup } from '../../../utils/get_original_action_group';
import { AlertStates } from '../../../../common/alerting/metrics';
import { createFormatter } from '../../../../common/formatters';
import type { InfraBackendLibs, InfraLocators } from '../../infra_types';
import {
  buildFiredAlertReason,
  buildInvalidQueryAlertReason,
  buildNoDataAlertReason,
  stateToAlertMessage,
} from '../common/messages';
import type { AdditionalContext } from '../common/utils';
import {
  createScopedLogger,
  getContextForRecoveredAlerts,
  getMetricsViewInAppUrlWithSpaceId,
  UNGROUPED_FACTORY_KEY,
  hasAdditionalContext,
  validGroupByForContext,
  flattenAdditionalContext,
} from '../common/utils';
import { getEvaluationValues, getThresholds } from '../common/get_values';

import type { EvaluatedRuleParams, Evaluation } from './lib/evaluate_rule';
import { evaluateRule } from './lib/evaluate_rule';
import type { MissingGroupsRecord } from './lib/check_missing_group';
import { convertStringsToMissingGroupsRecord } from './lib/convert_strings_to_missing_groups_record';

export type MetricThresholdAlert = Omit<
  ObservabilityMetricsAlert,
  'kibana.alert.evaluation.values' | 'kibana.alert.evaluation.threshold' | 'kibana.alert.group'
> & {
  // Defining a custom type for this because the schema generation script doesn't allow explicit null values
  [ALERT_EVALUATION_VALUES]?: Array<number | null>;
  [ALERT_EVALUATION_THRESHOLD]?: Array<number | null>;
  [ALERT_GROUP]?: Group[];
  [ALERT_INDEX_PATTERN]?: string;
};

export type MetricThresholdRuleParams = Record<string, any>;
export type MetricThresholdRuleTypeState = RuleTypeState & {
  lastRunTimestamp?: number;
  missingGroups?: Array<string | MissingGroupsRecord>;
  groupBy?: string | string[];
  filterQuery?: string;
};
export type MetricThresholdAlertState = AlertState; // no specific instance state used
export type MetricThresholdAlertContext = AlertContext; // no specific instance state used

export const FIRED_ACTIONS_ID = 'metrics.threshold.fired';
export const WARNING_ACTIONS_ID = 'metrics.threshold.warning';
export const NO_DATA_ACTIONS_ID = 'metrics.threshold.nodata';

type MetricThresholdActionGroup =
  | typeof FIRED_ACTIONS_ID
  | typeof WARNING_ACTIONS_ID
  | typeof NO_DATA_ACTIONS_ID
  | typeof RecoveredActionGroup.id;

type MetricThresholdAllowedActionGroups = ActionGroupIdsOf<
  typeof FIRED_ACTIONS | typeof WARNING_ACTIONS | typeof NO_DATA_ACTIONS
>;

type MetricThresholdAlertReporter = (params: {
  id: string;
  reason: string;
  actionGroup: MetricThresholdActionGroup;
  context: MetricThresholdAlertContext;
  additionalContext?: AdditionalContext | null;
  evaluationValues?: Array<number | null>;
  groups?: Group[];
  grouping?: { flatten?: Record<string, unknown>; unflatten?: Record<string, unknown> };
  thresholds?: Array<number | null>;
  metricAlias: string;
}) => void;

// TODO: Refactor the executor code to have better flow-control with better
// reasoning of different state/conditions for improved maintainability
export const createMetricThresholdExecutor =
  (libs: InfraBackendLibs, { assetDetailsLocator, metricsExplorerLocator }: InfraLocators) =>
  async (
    options: RuleExecutorOptions<
      MetricThresholdRuleParams,
      MetricThresholdRuleTypeState,
      MetricThresholdAlertState,
      MetricThresholdAlertContext,
      MetricThresholdAllowedActionGroups,
      MetricThresholdAlert
    >
  ) => {
    const startTime = Date.now();

    const {
      services,
      params,
      state,
      startedAt,
      executionId,
      spaceId,
      rule: { id: ruleId },
    } = options;

    const { criteria } = params;
    if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');

    const groupBy = castArray<string>(params.groupBy);

    const logger = createScopedLogger(libs.logger, 'metricThresholdRule', {
      alertId: ruleId,
      executionId,
    });

    const { alertsClient, savedObjectsClient } = services;
    if (!alertsClient) {
      throw new AlertsClientError();
    }

    const alertReporter: MetricThresholdAlertReporter = ({
      id,
      reason,
      actionGroup,
      context: contextWithoutAlertDetailsUrl,
      additionalContext,
      evaluationValues,
      groups,
      thresholds,
      grouping,
      metricAlias,
    }) => {
      const { uuid } = alertsClient.report({
        id,
        actionGroup,
      });

      alertsClient.setAlertData({
        id,
        payload: {
          [ALERT_REASON]: reason,
          [ALERT_EVALUATION_VALUES]: evaluationValues,
          [ALERT_EVALUATION_THRESHOLD]: thresholds,
          [ALERT_GROUP]: groups,
          [ALERT_GROUPING]: grouping?.unflatten,
          [ALERT_INDEX_PATTERN]: metricAlias,
          ...flattenAdditionalContext(additionalContext),
          ...getEcsGroupsFromFlattenGrouping(grouping?.flatten),
        },
        context: {
          ...contextWithoutAlertDetailsUrl,
          alertDetailsUrl: getAlertDetailsUrl(libs.basePath, spaceId, uuid),
        },
      });
    };

    const {
      sourceId,
      alertOnNoData,
      alertOnGroupDisappear: _alertOnGroupDisappear,
    } = params as {
      sourceId?: string;
      alertOnNoData: boolean;
      alertOnGroupDisappear: boolean | undefined;
    };

    const source = await libs.sources.getSourceConfiguration(
      savedObjectsClient,
      sourceId || 'default'
    );

    if (!params.filterQuery && params.filterQueryText) {
      try {
        const { fromKueryExpression } = await import('@kbn/es-query');
        fromKueryExpression(params.filterQueryText);
      } catch (e) {
        const timestamp = startedAt.toISOString();
        const actionGroupId = FIRED_ACTIONS_ID; // Change this to an Error action group when able
        const reason = buildInvalidQueryAlertReason(params.filterQueryText);
        const alertContext = {
          alertState: stateToAlertMessage[AlertStates.ERROR],
          group: UNGROUPED_FACTORY_KEY,
          metric: mapToConditionsLookup(criteria, (c) => c.metric),
          reason,
          timestamp,
          value: null,
          // TODO: Check if we need additionalContext here or not?
          viewInAppUrl: getMetricsViewInAppUrlWithSpaceId({
            timestamp,
            groupBy,
            assetDetailsLocator,
            metricsExplorerLocator,
          }),
        };

        alertReporter({
          id: UNGROUPED_FACTORY_KEY,
          reason,
          actionGroup: actionGroupId,
          context: alertContext,
          metricAlias: source.configuration.metricAlias,
        });

        return {
          state: {
            lastRunTimestamp: startedAt.valueOf(),
            missingGroups: [],
            groupBy,
            filterQuery: params.filterQuery,
          },
        };
      }
    }

    // For backwards-compatibility, interpret undefined alertOnGroupDisappear as true
    const alertOnGroupDisappear =
      _alertOnGroupDisappear !== false && params.noDataBehavior !== 'recover';

    const config = source.configuration;
    const compositeSize = libs.configuration.alerting.metric_threshold.group_by_page_size;

    const filterQueryIsSame = isEqual(state.filterQuery, params.filterQuery);
    const groupByIsSame = isEqual(state.groupBy, params.groupBy);
    const previousMissingGroups =
      alertOnGroupDisappear && filterQueryIsSame && groupByIsSame && state.missingGroups
        ? state.missingGroups.filter((missingGroup) =>
            // We use isTrackedAlert to remove missing groups that are untracked by the user
            typeof missingGroup === 'string'
              ? alertsClient.isTrackedAlert(missingGroup)
              : alertsClient.isTrackedAlert(missingGroup.key)
          )
        : [];

    const alertResults = await evaluateRule(
      services.scopedClusterClient.asCurrentUser,
      params as EvaluatedRuleParams,
      config,
      compositeSize,
      alertOnGroupDisappear,
      logger,
      state.lastRunTimestamp,
      { end: startedAt.valueOf() },
      convertStringsToMissingGroupsRecord(previousMissingGroups)
    );

    const resultGroupSet = new Set<string>();
    const flattenGroupings: Record<string, ReturnType<typeof getFlattenGrouping>> = {};
    for (const resultSet of alertResults) {
      for (const group of Object.keys(resultSet)) {
        resultGroupSet.add(group);
        if (!flattenGroupings[group]) {
          flattenGroupings[group] = getFlattenGrouping({
            groupBy: params.groupBy,
            bucketKey: resultSet[group].bucketKey,
          });
        }
      }
    }

    const groupArray = [...resultGroupSet];
    const nextMissingGroups = new Set<MissingGroupsRecord>();
    const hasGroups = !isEqual(groupArray, [UNGROUPED_FACTORY_KEY]);
    let scheduledActionsCount = 0;

    // The key of `groupArray` is the alert instance ID.
    for (const group of groupArray) {
      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = alertResults.every((result) => result[group]?.shouldFire);
      const shouldAlertWarn = alertResults.every((result) => result[group]?.shouldWarn);
      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoDataFound = alertResults.some((result) => result[group]?.isNoData);

      if (isNoDataFound && group !== UNGROUPED_FACTORY_KEY) {
        nextMissingGroups.add({ key: group, bucketKey: alertResults[0][group].bucketKey });
      }

      const isIndeterminateState =
        isNoDataFound &&
        params.noDataBehavior === 'remainActive' &&
        alertsClient.isTrackedAlert(group);

      const isAlertOnNoDataEnabled = params.noDataBehavior
        ? params.noDataBehavior === 'alertOnNoData'
        : alertOnNoData || alertOnGroupDisappear;

      const nextState =
        isNoDataFound && isAlertOnNoDataEnabled
          ? AlertStates.NO_DATA
          : isIndeterminateState
          ? AlertStates.ALERT
          : shouldAlertFire
          ? AlertStates.ALERT
          : shouldAlertWarn
          ? AlertStates.WARNING
          : AlertStates.OK;

      let reason;
      if (
        (nextState === AlertStates.ALERT || nextState === AlertStates.WARNING) &&
        !isIndeterminateState
      ) {
        reason = alertResults
          .map((result) =>
            buildFiredAlertReason({
              ...formatAlertResult(
                {
                  ...result[group],
                  comparator: convertToBuiltInComparators(result[group].comparator),
                  warningComparator: result[group].comparator
                    ? convertToBuiltInComparators(result[group].comparator)
                    : undefined,
                },
                nextState === AlertStates.WARNING
              ),
              group,
            })
          )
          .join('\n');
      }

      /* NO DATA STATE HANDLING
       *
       * - `alertOnNoData` does not indicate IF the alert's next state is No Data, but whether or not the user WANTS TO BE ALERTED
       *   if the state were No Data.
       * - `alertOnGroupDisappear`, on the other hand, determines whether or not it's possible to return a No Data state
       *   when a group disappears.
       *
       * This means we need to handle the possibility that `alertOnNoData` is false, but `alertOnGroupDisappear` is true
       *
       * nextState === NO_DATA would be true on both { '*': No Data } or, e.g. { 'a': No Data, 'b': OK, 'c': OK }, but if the user
       * has for some reason disabled `alertOnNoData` and left `alertOnGroupDisappear` enabled, they would only care about the latter
       * possibility. In this case, use hasGroups to determine whether to alert on a potential No Data state
       *
       * If `alertOnNoData` is true but `alertOnGroupDisappear` is false, we don't need to worry about the {a, b, c} possibility.
       * At this point in the function, a false `alertOnGroupDisappear` would already have prevented group 'a' from being evaluated at all.
       */
      const shouldBuildNoDataReason = params.noDataBehavior
        ? params.noDataBehavior !== 'recover'
        : alertOnNoData || (alertOnGroupDisappear && hasGroups);

      if (shouldBuildNoDataReason) {
        // In the previous line we've determined if the user is interested in No Data states, so only now do we actually
        // check to see if a No Data state has occurred
        if (nextState === AlertStates.NO_DATA || isIndeterminateState) {
          reason = alertResults
            .filter((result) => result[group]?.isNoData)
            .map((result) => buildNoDataAlertReason({ ...result[group], group }))
            .join('\n');
        }
      }

      if (reason) {
        const timestamp = startedAt.toISOString();
        const actionGroupId: MetricThresholdActionGroup =
          nextState === AlertStates.OK
            ? RecoveredActionGroup.id
            : nextState === AlertStates.NO_DATA
            ? NO_DATA_ACTIONS_ID
            : nextState === AlertStates.WARNING
            ? WARNING_ACTIONS_ID
            : FIRED_ACTIONS_ID;

        const additionalContext = hasAdditionalContext(params.groupBy, validGroupByForContext)
          ? alertResults && alertResults.length > 0
            ? alertResults[0][group].context ?? {}
            : {}
          : {};

        additionalContext.tags = Array.from(
          new Set([...(additionalContext.tags ?? []), ...options.rule.tags])
        );

        const evaluationValues = getEvaluationValues<Evaluation>(alertResults, group);
        const thresholds = getThresholds<any>(criteria);
        const groups: Group[] | undefined = getFormattedGroups(flattenGroupings[group]);

        const grouping = unflattenGrouping(flattenGroupings[group]);

        const alertContext = {
          alertState: stateToAlertMessage[nextState],
          group,
          grouping,
          groupByKeys: grouping,
          metric: mapToConditionsLookup(criteria, (c) => {
            if (c.aggType === 'count') {
              return 'count';
            }
            return c.metric;
          }),
          reason,
          threshold: mapToConditionsLookup(alertResults, (result, index) => {
            const evaluation = result[group] as Evaluation;
            if (!evaluation) {
              return criteria[index].threshold;
            }
            return formatAlertResult({
              ...evaluation,
              comparator: convertToBuiltInComparators(evaluation.comparator),
              warningComparator: evaluation.warningComparator
                ? convertToBuiltInComparators(evaluation.warningComparator)
                : undefined,
            }).threshold;
          }),
          timestamp,
          value: mapToConditionsLookup(alertResults, (result, index) => {
            const evaluation = result[group] as Evaluation;
            if (!evaluation && criteria[index].aggType === 'count') {
              return 0;
            } else if (!evaluation) {
              return null;
            }
            return formatAlertResult({
              ...evaluation,
              comparator: convertToBuiltInComparators(evaluation.comparator),
              warningComparator: evaluation.warningComparator
                ? convertToBuiltInComparators(evaluation.warningComparator)
                : undefined,
            }).currentValue;
          }),
          viewInAppUrl: getMetricsViewInAppUrlWithSpaceId({
            timestamp,
            groupBy,
            assetDetailsLocator,
            metricsExplorerLocator,
            additionalContext,
          }),
          ...additionalContext,
        };

        alertReporter({
          id: `${group}`,
          reason,
          actionGroup: actionGroupId,
          context: alertContext,
          additionalContext,
          evaluationValues,
          groups,
          thresholds,
          grouping: { flatten: flattenGroupings[group], unflatten: grouping },
          metricAlias: source.configuration.metricAlias,
        });
        scheduledActionsCount++;
      }
    }

    const recoveredAlerts = alertsClient?.getRecoveredAlerts() ?? [];

    for (const recoveredAlert of recoveredAlerts) {
      const recoveredAlertId = recoveredAlert.alert.getId();
      const alertUuid = recoveredAlert.alert.getUuid();
      const timestamp = startedAt.toISOString();
      const indexedStartedAt = recoveredAlert.alert.getStart() ?? timestamp;

      const alertHits = recoveredAlert.hit;
      const additionalContext = getContextForRecoveredAlerts(alertHits);
      const originalActionGroup = getOriginalActionGroup(alertHits);

      recoveredAlert.alert.setContext({
        alertDetailsUrl: getAlertDetailsUrl(libs.basePath, spaceId, alertUuid),
        alertState: stateToAlertMessage[AlertStates.OK],
        group: recoveredAlertId,
        groupByKeys: alertHits?.[ALERT_GROUPING],
        metric: mapToConditionsLookup(criteria, (c) => {
          if (criteria.aggType === 'count') {
            return 'count';
          }
          return c.metric;
        }),
        timestamp,
        threshold: mapToConditionsLookup(criteria, (c) => c.threshold),
        viewInAppUrl: getMetricsViewInAppUrlWithSpaceId({
          timestamp: indexedStartedAt,
          groupBy,
          assetDetailsLocator,
          metricsExplorerLocator,
          additionalContext,
        }),
        reason: alertHits?.[ALERT_REASON],
        grouping: alertHits?.[ALERT_GROUPING],
        originalAlertState: translateActionGroupToAlertState(originalActionGroup),
        originalAlertStateWasALERT: originalActionGroup === FIRED_ACTIONS.id,
        originalAlertStateWasWARNING: originalActionGroup === WARNING_ACTIONS.id,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        originalAlertStateWasNO_DATA: originalActionGroup === NO_DATA_ACTIONS.id,
        ...additionalContext,
      });
    }

    const stopTime = Date.now();
    logger.debug(`Scheduled ${scheduledActionsCount} actions in ${stopTime - startTime}ms`);
    return {
      state: {
        lastRunTimestamp: startedAt.valueOf(),
        missingGroups: [...nextMissingGroups],
        groupBy,
        filterQuery: params.filterQuery,
      },
    };
  };

export const FIRED_ACTIONS = {
  id: 'metrics.threshold.fired',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.fired', {
    defaultMessage: 'Alert',
  }),
};

export const WARNING_ACTIONS = {
  id: 'metrics.threshold.warning',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.warning', {
    defaultMessage: 'Warning',
  }),
};

export const NO_DATA_ACTIONS = {
  id: 'metrics.threshold.nodata',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.nodata', {
    defaultMessage: 'No Data',
  }),
};

const translateActionGroupToAlertState = (
  actionGroupId: string | undefined
): string | undefined => {
  if (actionGroupId === FIRED_ACTIONS.id) {
    return stateToAlertMessage[AlertStates.ALERT];
  }
  if (actionGroupId === WARNING_ACTIONS.id) {
    return stateToAlertMessage[AlertStates.WARNING];
  }
  if (actionGroupId === NO_DATA_ACTIONS.id) {
    return stateToAlertMessage[AlertStates.NO_DATA];
  }
};

const mapToConditionsLookup = (
  list: any[],
  mapFn: (value: any, index: number, array: any[]) => unknown
) =>
  list.map(mapFn).reduce((result: Record<string, any>, value, i) => {
    result[`condition${i}`] = value;
    return result;
  }, {} as Record<string, unknown>);

const formatAlertResult = <AlertResult>(
  alertResult: {
    metric: string;
    currentValue: number | null;
    threshold: number[];
    comparator: COMPARATORS;
    warningThreshold?: number[];
    warningComparator?: COMPARATORS;
    timeSize: number;
    timeUnit: TimeUnitChar;
  } & AlertResult,
  useWarningThreshold?: boolean
) => {
  const { metric, currentValue, threshold, comparator, warningThreshold, warningComparator } =
    alertResult;
  const noDataValue = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.noDataFormattedValue',
    { defaultMessage: '[NO DATA]' }
  );
  const thresholdToFormat = useWarningThreshold ? warningThreshold! : threshold;
  const comparatorToUse = useWarningThreshold ? warningComparator! : comparator;

  if (metric.endsWith('.pct')) {
    const formatter = createFormatter('percent');
    return {
      ...alertResult,
      currentValue:
        currentValue !== null && currentValue !== undefined ? formatter(currentValue) : noDataValue,
      threshold: Array.isArray(thresholdToFormat)
        ? thresholdToFormat.map((v: number) => formatter(v))
        : formatter(thresholdToFormat),
      comparator: convertToBuiltInComparators(comparatorToUse),
    };
  }

  const formatter = createFormatter('highPrecision');
  return {
    ...alertResult,
    currentValue:
      currentValue !== null && currentValue !== undefined ? formatter(currentValue) : noDataValue,
    threshold: Array.isArray(thresholdToFormat)
      ? thresholdToFormat.map((v: number) => formatter(v))
      : formatter(thresholdToFormat),
    comparator: comparatorToUse,
  };
};
