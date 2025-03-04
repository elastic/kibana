/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Group } from '@kbn/alerting-rule-utils';
import type { ALERT_GROUP } from '@kbn/rule-data-utils';
import {
  ALERT_REASON,
  ALERT_EVALUATION_VALUES,
  ALERT_EVALUATION_THRESHOLD,
} from '@kbn/rule-data-utils';
import { first, get } from 'lodash';
import type {
  ActionGroup,
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '@kbn/alerting-plugin/common';
import type { RuleExecutorOptions, RuleTypeState } from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { convertToBuiltInComparators, getAlertDetailsUrl } from '@kbn/observability-plugin/common';
import type { InventoryItemType, SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import type { ObservabilityMetricsAlert } from '@kbn/alerts-as-data-utils';
import { getOriginalActionGroup } from '../../../utils/get_original_action_group';
import type {
  InventoryMetricConditions,
  InventoryMetricThresholdParams,
} from '../../../../common/alerting/metrics';
import { AlertStates } from '../../../../common/alerting/metrics';
import { createFormatter } from '../../../../common/formatters';
import { getCustomMetricLabel } from '../../../../common/formatters/get_custom_metric_label';
import { METRIC_FORMATTERS } from '../../../../common/formatters/snapshot_metric_formats';
import { toMetricOpt } from '../../../../common/snapshot_metric_i18n';
import type { InfraBackendLibs, InfraLocators } from '../../infra_types';
import type { LogQueryFields } from '../../metrics/types';
import {
  buildErrorAlertReason,
  buildFiredAlertReason,
  buildInvalidQueryAlertReason,
  buildNoDataAlertReason,
  stateToAlertMessage,
} from '../common/messages';
import {
  createScopedLogger,
  flattenAdditionalContext,
  getContextForRecoveredAlerts,
  getInventoryViewInAppUrlWithSpaceId,
  UNGROUPED_FACTORY_KEY,
} from '../common/utils';
import { getEvaluationValues, getThresholds } from '../common/get_values';
import type { ConditionResult } from './evaluate_condition';
import { evaluateCondition } from './evaluate_condition';

type InventoryMetricThresholdAllowedActionGroups = ActionGroupIdsOf<
  typeof FIRED_ACTIONS | typeof WARNING_ACTIONS
>;

export const FIRED_ACTIONS_ID = 'metrics.inventory_threshold.fired';
export const WARNING_ACTIONS_ID = 'metrics.inventory_threshold.warning';

export type InventoryMetricThresholdRuleTypeState = RuleTypeState; // no specific state used
export type InventoryMetricThresholdAlertState = AlertState; // no specific state used
export type InventoryMetricThresholdAlertContext = AlertContext; // no specific instance context used

export type InventoryMetricThresholdAlert = Omit<
  ObservabilityMetricsAlert,
  'kibana.alert.evaluation.values' | 'kibana.alert.evaluation.threshold' | 'kibana.alert.group'
> & {
  // Defining a custom type for this because the schema generation script doesn't allow explicit null values
  [ALERT_EVALUATION_VALUES]?: Array<number | null>;
  [ALERT_EVALUATION_THRESHOLD]?: Array<number | null>;
  [ALERT_GROUP]?: Group[];
};

export const createInventoryMetricThresholdExecutor =
  (
    libs: InfraBackendLibs,
    { alertsLocator, assetDetailsLocator, inventoryLocator }: InfraLocators
  ) =>
  async (
    options: RuleExecutorOptions<
      InventoryMetricThresholdParams & Record<string, unknown>,
      InventoryMetricThresholdRuleTypeState,
      InventoryMetricThresholdAlertState,
      InventoryMetricThresholdAlertContext,
      InventoryMetricThresholdAllowedActionGroups,
      InventoryMetricThresholdAlert
    >
  ) => {
    const {
      services,
      params,
      startedAt,
      executionId,
      spaceId,
      rule: { id: ruleId, tags: ruleTags },
      getTimeRange,
    } = options;

    const startTime = Date.now();

    const { criteria, filterQuery, sourceId = 'default', nodeType, alertOnNoData } = params;

    if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');

    const logger = createScopedLogger(libs.logger, 'inventoryRule', {
      alertId: ruleId,
      executionId,
    });

    const esClient = services.scopedClusterClient.asCurrentUser;

    const { savedObjectsClient, alertsClient } = services;

    if (!alertsClient) {
      throw new AlertsClientError();
    }

    if (!params.filterQuery && params.filterQueryText) {
      try {
        const { fromKueryExpression } = await import('@kbn/es-query');
        fromKueryExpression(params.filterQueryText);
      } catch (e) {
        logger.error(e.message);

        const actionGroup = FIRED_ACTIONS.id; // Change this to an Error action group when able,
        const reason = buildInvalidQueryAlertReason(params.filterQueryText);

        const { uuid, start } = alertsClient.report({
          id: UNGROUPED_FACTORY_KEY,
          actionGroup,
        });

        const indexedStartedAt = start ?? startedAt.toISOString();
        alertsClient.setAlertData({
          id: UNGROUPED_FACTORY_KEY,
          payload: {
            [ALERT_REASON]: reason,
          },
          context: {
            alertDetailsUrl: await getAlertDetailsUrl(libs.basePath, spaceId, uuid),
            alertState: stateToAlertMessage[AlertStates.ERROR],
            group: UNGROUPED_FACTORY_KEY,
            metric: mapToConditionsLookup(criteria, (c) => c.metric),
            reason,
            timestamp: startedAt.toISOString(),
            value: null,
            viewInAppUrl: getInventoryViewInAppUrlWithSpaceId({
              criteria,
              nodeType,
              timestamp: indexedStartedAt,
              assetDetailsLocator,
              inventoryLocator,
            }),
          },
        });

        return { state: {} };
      }
    }
    const source = await libs.sources.getSourceConfiguration(savedObjectsClient, sourceId);

    const [, { logsShared, logsDataAccess }] = await libs.getStartServices();

    const logSourcesService =
      logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(savedObjectsClient);

    const logQueryFields: LogQueryFields | undefined = await logsShared.logViews
      .getClient(savedObjectsClient, esClient, logSourcesService)
      .getResolvedLogView({
        type: 'log-view-reference',
        logViewId: sourceId,
      })
      .then(
        ({ indices }) => ({ indexPattern: indices }),
        () => undefined
      );

    const compositeSize = libs.configuration.alerting.inventory_threshold.group_by_page_size;
    const { dateEnd } = getTimeRange();
    const results = await Promise.all(
      criteria.map((condition) =>
        evaluateCondition({
          compositeSize,
          condition,
          esClient,
          executionTimestamp: new Date(dateEnd),
          filterQuery,
          logger,
          logQueryFields,
          nodeType,
          source,
        })
      )
    );

    let scheduledActionsCount = 0;
    const alertLimit = alertsClient.getAlertLimitValue();
    let hasReachedLimit = false;
    const inventoryItems = Object.keys(first(results)!);
    for (const group of inventoryItems) {
      if (scheduledActionsCount >= alertLimit) {
        // need to set this so that warning is displayed in the UI and in the logs
        hasReachedLimit = true;
        break; // once limit is reached, we break out of the loop and don't schedule any more alerts
      }
      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = results.every((result) => result[group]?.shouldFire);
      const shouldAlertWarn = results.every((result) => result[group]?.shouldWarn);
      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoData = results.some((result) => result[group]?.isNoData);
      const isError = results.some((result) => result[group]?.isError);

      const nextState = isError
        ? AlertStates.ERROR
        : isNoData
        ? AlertStates.NO_DATA
        : shouldAlertFire
        ? AlertStates.ALERT
        : shouldAlertWarn
        ? AlertStates.WARNING
        : AlertStates.OK;
      let reason;
      if (nextState === AlertStates.ALERT || nextState === AlertStates.WARNING) {
        reason = results
          .map((result) =>
            buildReasonWithVerboseMetricName({
              group,
              resultItem: result[group],
              buildReason: buildFiredAlertReason,
              useWarningThreshold: nextState === AlertStates.WARNING,
              nodeType,
            })
          )
          .join('\n');
      }
      if (alertOnNoData) {
        if (nextState === AlertStates.NO_DATA) {
          reason = results
            .filter((result) => result[group].isNoData)
            .map((result) =>
              buildReasonWithVerboseMetricName({
                group,
                resultItem: result[group],
                buildReason: buildNoDataAlertReason,
                nodeType,
              })
            )
            .join('\n');
        } else if (nextState === AlertStates.ERROR) {
          reason = results
            .filter((result) => result[group].isError)
            .map((result) =>
              buildReasonWithVerboseMetricName({
                group,
                resultItem: result[group],
                buildReason: buildErrorAlertReason,
                nodeType,
              })
            )
            .join('\n');
        }
      }
      if (reason) {
        const actionGroup =
          nextState === AlertStates.WARNING ? WARNING_ACTIONS_ID : FIRED_ACTIONS_ID;

        const additionalContext = results && results.length > 0 ? results[0][group].context : {};
        additionalContext.tags = Array.from(
          new Set([...(additionalContext.tags ?? []), ...ruleTags])
        );

        const evaluationValues = getEvaluationValues<ConditionResult>(results, group);
        const thresholds = getThresholds<InventoryMetricConditions>(criteria);

        const { uuid, start } = alertsClient.report({
          id: group,
          actionGroup,
        });

        const indexedStartedAt = start ?? startedAt.toISOString();

        scheduledActionsCount++;

        const context = {
          alertDetailsUrl: await getAlertDetailsUrl(libs.basePath, spaceId, uuid),
          alertState: stateToAlertMessage[nextState],
          group,
          reason,
          metric: mapToConditionsLookup(criteria, (c) => c.metric),
          timestamp: startedAt.toISOString(),
          threshold: mapToConditionsLookup(criteria, (c) => c.threshold),
          value: mapToConditionsLookup(results, (result) =>
            formatMetric(result[group].metric, result[group].currentValue)
          ),
          viewInAppUrl: getInventoryViewInAppUrlWithSpaceId({
            criteria,
            nodeType,
            timestamp: indexedStartedAt,
            hostName: additionalContext?.host?.name,
            assetDetailsLocator,
            inventoryLocator,
          }),
          ...additionalContext,
        };

        const payload = {
          [ALERT_REASON]: reason,
          [ALERT_EVALUATION_VALUES]: evaluationValues,
          [ALERT_EVALUATION_THRESHOLD]: thresholds,
          ...flattenAdditionalContext(additionalContext),
        };

        alertsClient.setAlertData({
          id: group,
          payload,
          context,
        });
      }
    }

    alertsClient.setAlertLimitReached(hasReachedLimit);
    const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];

    for (const recoveredAlert of recoveredAlerts) {
      const recoveredAlertId = recoveredAlert.alert.getId();
      const indexedStartedAt = recoveredAlert.alert.getStart() ?? startedAt.toISOString();
      const alertUuid = recoveredAlert.alert.getUuid();
      const alertHits = recoveredAlert.hit;
      const additionalContext = getContextForRecoveredAlerts(alertHits);
      const originalActionGroup = getOriginalActionGroup(alertHits);

      const recoveredContext = {
        alertDetailsUrl: await getAlertDetailsUrl(libs.basePath, spaceId, alertUuid),
        alertState: stateToAlertMessage[AlertStates.OK],
        group: recoveredAlertId,
        metric: mapToConditionsLookup(criteria, (c) => c.metric),
        threshold: mapToConditionsLookup(criteria, (c) => c.threshold),
        timestamp: startedAt.toISOString(),
        viewInAppUrl: getInventoryViewInAppUrlWithSpaceId({
          criteria,
          nodeType,
          timestamp: indexedStartedAt,
          hostName: additionalContext?.host?.name,
          assetDetailsLocator,
          inventoryLocator,
        }),
        originalAlertState: translateActionGroupToAlertState(originalActionGroup),
        originalAlertStateWasALERT: originalActionGroup === FIRED_ACTIONS_ID,
        originalAlertStateWasWARNING: originalActionGroup === WARNING_ACTIONS_ID,
        ...additionalContext,
      };

      alertsClient.setAlertData({
        id: recoveredAlertId,
        context: recoveredContext,
      });
    }

    const stopTime = Date.now();
    logger.debug(`Scheduled ${scheduledActionsCount} actions in ${stopTime - startTime}ms`);

    return { state: {} };
  };

const formatThreshold = (metric: SnapshotMetricType, value: number | number[]) => {
  const metricFormatter = get(METRIC_FORMATTERS, metric, METRIC_FORMATTERS.count);
  const formatter = createFormatter(metricFormatter.formatter, metricFormatter.template);

  const threshold = Array.isArray(value)
    ? value.map((v: number) => {
        if (metricFormatter.formatter === 'percent') {
          v = Number(v) / 100;
        }
        if (metricFormatter.formatter === 'bits') {
          v = Number(v) / 8;
        }
        return formatter(v);
      })
    : value;
  return threshold;
};

const buildReasonWithVerboseMetricName = ({
  group,
  resultItem,
  buildReason,
  useWarningThreshold,
  nodeType,
}: {
  group: string;
  resultItem: ConditionResult;
  buildReason: (r: any) => string;
  useWarningThreshold?: boolean;
  nodeType?: InventoryItemType;
}) => {
  if (!resultItem) return '';

  const thresholdToFormat = useWarningThreshold
    ? resultItem.warningThreshold!
    : resultItem.threshold;
  const resultWithVerboseMetricName = {
    ...resultItem,
    group,
    metric:
      toMetricOpt(resultItem.metric, nodeType)?.text ||
      (resultItem.metric === 'custom' && resultItem.customMetric
        ? getCustomMetricLabel(resultItem.customMetric)
        : resultItem.metric),
    currentValue: formatMetric(resultItem.metric, resultItem.currentValue),
    threshold: formatThreshold(resultItem.metric, thresholdToFormat),
    comparator: useWarningThreshold
      ? convertToBuiltInComparators(resultItem.warningComparator!)
      : convertToBuiltInComparators(resultItem.comparator),
  };
  return buildReason(resultWithVerboseMetricName);
};

const mapToConditionsLookup = (
  list: any[],
  mapFn: (value: any, index: number, array: any[]) => unknown
) =>
  list.map(mapFn).reduce<Record<string, any>>((result, value, i) => {
    result[`condition${i}`] = value;
    return result;
  }, {});

export const FIRED_ACTIONS: ActionGroup<typeof FIRED_ACTIONS_ID> = {
  id: FIRED_ACTIONS_ID,
  name: i18n.translate('xpack.infra.metrics.alerting.inventory.threshold.fired', {
    defaultMessage: 'Alert',
  }),
};
export const WARNING_ACTIONS = {
  id: WARNING_ACTIONS_ID,
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.warning', {
    defaultMessage: 'Warning',
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
};

const formatMetric = (metric: SnapshotMetricType, value: number) => {
  const metricFormatter = get(METRIC_FORMATTERS, metric, METRIC_FORMATTERS.count);
  if (isNaN(value)) {
    return i18n.translate('xpack.infra.metrics.alerting.inventory.noDataFormattedValue', {
      defaultMessage: '[NO DATA]',
    });
  }
  const formatter = createFormatter(metricFormatter.formatter, metricFormatter.template);
  return formatter(value);
};
