/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import {
  ALERT_EVALUATION_VALUES,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_REASON,
  ALERT_GROUP,
} from '@kbn/rule-data-utils';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { RecoveredActionGroup } from '@kbn/alerting-plugin/common';
import { IBasePath, Logger } from '@kbn/core/server';
import { AlertsClientError, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { getEcsGroups } from '@kbn/alerting-rule-utils';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { getEsQueryConfig } from '../../../utils/get_es_query_config';
import { AlertsLocatorParams, getAlertDetailsUrl } from '../../../../common';
import { getViewInAppUrl } from '../../../../common/custom_threshold_rule/get_view_in_app_url';
import { ObservabilityConfig } from '../../..';
import { getEvaluationValues, getThreshold } from './lib/get_values';
import { FIRED_ACTIONS_ID, NO_DATA_ACTIONS_ID, UNGROUPED_FACTORY_KEY } from './constants';
import {
  AlertStates,
  CustomThresholdRuleTypeParams,
  CustomThresholdRuleTypeState,
  CustomThresholdAlertState,
  CustomThresholdAlertContext,
  CustomThresholdSpecificActionGroups,
  CustomThresholdActionGroup,
  CustomThresholdAlert,
} from './types';
import { buildFiredAlertReason, buildNoDataAlertReason } from './messages';
import {
  createScopedLogger,
  hasAdditionalContext,
  validGroupByForContext,
  flattenAdditionalContext,
  getFormattedGroupBy,
  getContextForRecoveredAlerts,
} from './utils';

import { formatAlertResult, getLabel } from './lib/format_alert_result';
import { EvaluatedRuleParams, evaluateRule } from './lib/evaluate_rule';
import { MissingGroupsRecord } from './lib/check_missing_group';

export interface CustomThresholdLocators {
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
  logsLocator?: LocatorPublic<DiscoverAppLocatorParams>;
}

export const createCustomThresholdExecutor = ({
  basePath,
  logger,
  config,
  locators: { logsLocator },
}: {
  basePath: IBasePath;
  logger: Logger;
  config: ObservabilityConfig;
  locators: CustomThresholdLocators;
}) =>
  async function (
    options: RuleExecutorOptions<
      CustomThresholdRuleTypeParams,
      CustomThresholdRuleTypeState,
      CustomThresholdAlertState,
      CustomThresholdAlertContext,
      CustomThresholdSpecificActionGroups,
      CustomThresholdAlert
    >
  ) {
    const startTime = Date.now();

    const {
      services,
      params,
      state,
      startedAt,
      executionId,
      spaceId,
      rule: { id: ruleId },
      getTimeRange,
    } = options;

    const { criteria } = params;

    if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');
    const thresholdLogger = createScopedLogger(logger, 'thresholdRule', {
      alertId: ruleId,
      executionId,
    });

    const { alertsClient, uiSettingsClient } = services;
    const searchSourceClient = await services.getSearchSourceClient();

    if (!alertsClient) {
      throw new AlertsClientError();
    }

    const { alertOnNoData, alertOnGroupDisappear: _alertOnGroupDisappear } = params as {
      alertOnNoData: boolean;
      alertOnGroupDisappear: boolean | undefined;
    };

    // For backwards-compatibility, interpret undefined alertOnGroupDisappear as true
    const alertOnGroupDisappear = _alertOnGroupDisappear !== false;
    const compositeSize = config.customThresholdRule.groupByPageSize;
    const queryIsSame = isEqual(
      state.searchConfiguration?.query.query,
      params.searchConfiguration.query.query
    );
    const groupByIsSame = isEqual(state.groupBy, params.groupBy);
    const previousMissingGroups =
      alertOnGroupDisappear && queryIsSame && groupByIsSame && state.missingGroups
        ? state.missingGroups.filter((missingGroup) =>
            // We use isTrackedAlert to remove missing groups that are untracked by the user
            alertsClient.isTrackedAlert(missingGroup.key)
          )
        : [];

    const initialSearchSource = await searchSourceClient.create(params.searchConfiguration);
    const dataView = initialSearchSource.getField('index')!;
    const { id: dataViewId, timeFieldName } = dataView;
    const runtimeMappings = dataView.getRuntimeMappings();
    const dataViewIndexPattern = dataView.getIndexPattern();
    const dataViewName = dataView.getName();
    if (!dataViewIndexPattern) {
      throw new Error('No matched data view');
    } else if (!timeFieldName) {
      throw new Error('The selected data view does not have a timestamp field');
    }

    // Calculate initial start and end date with no time window, as each criterion has its own time window
    const { dateStart, dateEnd } = getTimeRange();
    const esQueryConfig = await getEsQueryConfig(uiSettingsClient);
    const alertResults = await evaluateRule(
      services.scopedClusterClient.asCurrentUser,
      params as EvaluatedRuleParams,
      dataViewIndexPattern,
      timeFieldName,
      compositeSize,
      alertOnGroupDisappear,
      logger,
      { end: dateEnd, start: dateStart },
      esQueryConfig,
      runtimeMappings,
      state.lastRunTimestamp,
      previousMissingGroups
    );

    const resultGroupSet = new Set<string>();
    for (const resultSet of alertResults) {
      for (const group of Object.keys(resultSet)) {
        resultGroupSet.add(group);
      }
    }

    const groupByKeysObjectMapping = getFormattedGroupBy(params.groupBy, resultGroupSet);
    const groupArray = [...resultGroupSet];
    const nextMissingGroups = new Set<MissingGroupsRecord>();
    const hasGroups = !isEqual(groupArray, [UNGROUPED_FACTORY_KEY]);
    let scheduledActionsCount = 0;

    const alertLimit = alertsClient.getAlertLimitValue();
    let hasReachedLimit = false;

    // The key of `groupArray` is the alert instance ID.
    for (const group of groupArray) {
      if (scheduledActionsCount >= alertLimit) {
        // need to set this so that warning is displayed in the UI and in the logs
        hasReachedLimit = true;
        break; // once limit is reached, we break out of the loop and don't schedule any more alerts
      }

      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = alertResults.every((result) => result[group]?.shouldFire);
      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoData = alertResults.some((result) => result[group]?.isNoData);

      if (isNoData && group !== UNGROUPED_FACTORY_KEY) {
        nextMissingGroups.add({ key: group, bucketKey: alertResults[0][group].bucketKey });
      }

      const nextState = isNoData
        ? AlertStates.NO_DATA
        : shouldAlertFire
        ? AlertStates.ALERT
        : AlertStates.OK;

      let reason;
      if (nextState === AlertStates.ALERT) {
        reason = buildFiredAlertReason(alertResults, group, dataViewName);
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
      if (alertOnNoData || (alertOnGroupDisappear && hasGroups)) {
        // In the previous line we've determined if the user is interested in No Data states, so only now do we actually
        // check to see if a No Data state has occurred
        if (nextState === AlertStates.NO_DATA) {
          reason = alertResults
            .filter((result) => result[group]?.isNoData)
            .map((result) =>
              buildNoDataAlertReason({ ...result[group], label: getLabel(result[group]), group })
            )
            .join('\n');
        }
      }

      if (reason) {
        const timestamp = startedAt.toISOString();
        const threshold = getThreshold(criteria);
        const evaluationValues = getEvaluationValues(alertResults, group);
        const actionGroupId: CustomThresholdActionGroup =
          nextState === AlertStates.OK
            ? RecoveredActionGroup.id
            : nextState === AlertStates.NO_DATA
            ? NO_DATA_ACTIONS_ID
            : FIRED_ACTIONS_ID;

        const additionalContext = hasAdditionalContext(params.groupBy, validGroupByForContext)
          ? alertResults && alertResults.length > 0
            ? alertResults[0][group].context ?? {}
            : {}
          : {};

        additionalContext.tags = Array.from(
          new Set([...(additionalContext.tags ?? []), ...options.rule.tags])
        );

        const groups = groupByKeysObjectMapping[group];

        const { uuid, start } = alertsClient.report({
          id: `${group}`,
          actionGroup: actionGroupId,
          payload: {
            [ALERT_REASON]: reason,
            [ALERT_EVALUATION_VALUES]: evaluationValues,
            [ALERT_EVALUATION_THRESHOLD]: threshold,
            [ALERT_GROUP]: groups,
            ...flattenAdditionalContext(additionalContext),
            ...getEcsGroups(groups),
          },
        });

        const indexedStartedAt = start ?? startedAt.toISOString();
        scheduledActionsCount++;

        alertsClient.setAlertData({
          id: `${group}`,
          context: {
            alertDetailsUrl: getAlertDetailsUrl(basePath, spaceId, uuid),
            group: groupByKeysObjectMapping[group],
            reason,
            timestamp,
            value: alertResults.map((result) => {
              const evaluation = result[group];
              if (!evaluation) {
                return null;
              }
              return formatAlertResult(evaluation).currentValue;
            }),
            viewInAppUrl: getViewInAppUrl({
              dataViewId: params.searchConfiguration?.index?.title ?? dataViewId,
              groups,
              logsLocator,
              metrics: alertResults.length === 1 ? alertResults[0][group].metrics : [],
              searchConfiguration: params.searchConfiguration,
              startedAt: indexedStartedAt,
              spaceId,
            }),
            ...additionalContext,
          },
        });
      }
    }

    alertsClient.setAlertLimitReached(hasReachedLimit);
    const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];

    const groupByKeysObjectForRecovered = getFormattedGroupBy(
      params.groupBy,
      new Set<string>(recoveredAlerts.map((recoveredAlert) => recoveredAlert.alert.getId()))
    );

    for (const recoveredAlert of recoveredAlerts) {
      const recoveredAlertId = recoveredAlert.alert.getId();
      const alertUuid = recoveredAlert.alert.getUuid();
      const indexedStartedAt = recoveredAlert.alert.getStart() ?? startedAt.toISOString();
      const group = groupByKeysObjectForRecovered[recoveredAlertId];

      const alertHits = recoveredAlert.hit;
      const additionalContext = getContextForRecoveredAlerts(alertHits);

      const context = {
        alertDetailsUrl: getAlertDetailsUrl(basePath, spaceId, alertUuid),
        group,
        timestamp: startedAt.toISOString(),
        viewInAppUrl: getViewInAppUrl({
          dataViewId,
          groups: group,
          logsLocator,
          metrics: params.criteria[0]?.metrics,
          searchConfiguration: params.searchConfiguration,
          startedAt: indexedStartedAt,
        }),
        ...additionalContext,
      };

      alertsClient.setAlertData({
        id: recoveredAlertId,
        context,
      });
    }

    const stopTime = Date.now();
    thresholdLogger.debug(
      `Scheduled ${scheduledActionsCount} actions in ${stopTime - startTime}ms`
    );
    return {
      state: {
        lastRunTimestamp: startedAt.valueOf(),
        missingGroups: [...nextMissingGroups],
        groupBy: params.groupBy,
        searchConfiguration: params.searchConfiguration,
      },
    };
  };
