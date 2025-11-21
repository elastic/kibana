/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { flattenObject } from '@kbn/object-utils';
import type { ExecutorType, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { ObservabilitySloAlert } from '@kbn/alerts-as-data-utils';
import type { IBasePath } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { getFormattedGroups, getEcsGroupsFromFlattenGrouping } from '@kbn/alerting-rule-utils';
import { getAlertDetailsUrl } from '@kbn/observability-plugin/common';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_GROUPING,
  ALERT_GROUP,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { ALL_VALUE } from '@kbn/slo-schema';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { upperCase } from 'lodash';
import type { AlertsClient } from '@kbn/alerting-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { GetTimeRange } from '@kbn/alerting-plugin/server';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
  NO_SLI_DATA_ACTIONS_ID,
  SLI_DESTINATION_INDEX_PATTERN,
  SLO_RESOURCES_VERSION_MAJOR,
  SUPPRESSED_PRIORITY_ACTION,
} from '../../../../common/constants';
import {
  SLO_ID_FIELD,
  SLO_INSTANCE_ID_FIELD,
  SLO_REVISION_FIELD,
  SLO_DATA_VIEW_ID_FIELD,
} from '../../../../common/field_names/slo';
import type { Duration, SLODefinition } from '../../../domain/models';
import { KibanaSavedObjectsSLORepository } from '../../../services';
import type { EsSummaryDocument } from '../../../services/summary_transform_generator/helpers/create_temp_summary';
import { evaluate } from './lib/evaluate';
import { evaluateDependencies } from './lib/evaluate_dependencies';
import { shouldSuppressInstanceId } from './lib/should_suppress_instance_id';
import { getSloSummary } from './lib/summary_repository';
import { buildSourceDataQuery } from './lib/build_source_query';
import type {
  BurnRateAlertContext,
  BurnRateAlertState,
  BurnRateAllowedActionGroups,
  BurnRateRuleParams,
  BurnRateRuleTypeState,
  Group,
  WindowSchema,
} from './types';
import { AlertStates } from './types';

export type BurnRateAlert = Omit<ObservabilitySloAlert, 'kibana.alert.group'> & {
  [ALERT_GROUP]?: Group[];
};

export const getRuleExecutor = (basePath: IBasePath) =>
  async function executor(
    options: RuleExecutorOptions<
      BurnRateRuleParams,
      BurnRateRuleTypeState,
      BurnRateAlertState,
      BurnRateAlertContext,
      BurnRateAllowedActionGroups,
      BurnRateAlert
    >
  ): ReturnType<
    ExecutorType<
      BurnRateRuleParams,
      BurnRateRuleTypeState,
      BurnRateAlertState,
      BurnRateAlertContext,
      BurnRateAllowedActionGroups
    >
  > {
    const { services, params, logger, startedAt, spaceId, getTimeRange } = options;

    const { savedObjectsClient: soClient, scopedClusterClient: esClient, alertsClient } = services;

    if (!alertsClient) {
      throw new AlertsClientError();
    }

    const sloRepository = new KibanaSavedObjectsSLORepository(soClient, logger);
    let slo: SLODefinition;
    try {
      slo = await sloRepository.findById(params.sloId);
    } catch (err) {
      throw createTaskRunError(
        new Error(
          `Rule "${options.rule.name}" ${options.rule.id} is referencing an SLO which cannot be found: "${params.sloId}": ${err.message}`
        ),
        TaskErrorSource.USER
      );
    }

    if (!slo.enabled) {
      return { state: {} };
    }

    // Check for SLI data and source data before burn rate evaluation
    const shouldProceed = await checkSliAndSourceData(
      esClient.asCurrentUser,
      slo,
      alertsClient,
      spaceId,
      basePath,
      startedAt,
      getTimeRange,
      logger,
      await services.getDataViews()
    );

    // Handle recovery for no-data alert if SLI data exists (shouldProceed = true)
    // The recovery logic at the end will handle this, but we need to ensure it runs
    // even if we return early. However, when shouldProceed = true, we continue to the end
    // where recovery logic is handled.
    
    if (!shouldProceed) {
      // No-data alert was triggered, return early without burn rate evaluation
      // Note: Recovery will be handled in the main recovery logic when SLI data exists again (shouldProceed = true)
      return { state: {} };
    }

    // We only need the end timestamp to base all of queries on. The length of the time range
    // doesn't matter for our use case since we allow the user to customize the window sizes,
    const { dateEnd } = getTimeRange('1m');
    const results = await evaluate(esClient.asCurrentUser, slo, params, new Date(dateEnd));

    const suppressResults =
      params.dependencies && results.some((res) => res.shouldAlert)
        ? (
            await evaluateDependencies(
              soClient,
              esClient.asCurrentUser,
              sloRepository,
              params.dependencies,
              new Date(dateEnd)
            )
          ).activeRules
        : [];

    if (results.length > 0) {
      const alertLimit = alertsClient.getAlertLimitValue();
      let hasReachedLimit = false;
      let scheduledActionsCount = 0;
      for (const result of results) {
        const {
          instanceId,
          groupings,
          shouldAlert,
          longWindowDuration,
          longWindowBurnRate,
          shortWindowDuration,
          shortWindowBurnRate,
          window: windowDef,
        } = result;

        const groupingsFlattened = flattenObject(groupings ?? {});
        const groups = getFormattedGroups(groupingsFlattened);

        const urlQuery = instanceId === ALL_VALUE ? '' : `?instanceId=${instanceId}`;
        const viewInAppUrl = addSpaceIdToPath(
          basePath.publicBaseUrl,
          spaceId,
          `/app/observability/slos/${slo.id}${urlQuery}`
        );
        if (shouldAlert) {
          const shouldSuppress = shouldSuppressInstanceId(suppressResults, instanceId);
          if (scheduledActionsCount >= alertLimit) {
            // need to set this so that warning is displayed in the UI and in the logs
            hasReachedLimit = true;
            break; // once limit is reached, we break out of the loop and don't schedule any more alerts
          }

          const sloSummary = await getSloSummary(esClient.asCurrentUser, slo, instanceId);

          const reason = buildReason(
            instanceId,
            windowDef.actionGroup,
            longWindowDuration,
            longWindowBurnRate,
            shortWindowDuration,
            shortWindowBurnRate,
            windowDef,
            shouldSuppress
          );

          const alertId = instanceId;
          const actionGroup = shouldSuppress
            ? SUPPRESSED_PRIORITY_ACTION.id
            : windowDef.actionGroup;

          const apmFields = extractApmFieldsFromSLOSummary(sloSummary);

          const { uuid } = alertsClient.report({
            id: alertId,
            actionGroup,
            state: {
              alertState: AlertStates.ALERT,
            },
            payload: {
              [ALERT_REASON]: reason,
              [ALERT_EVALUATION_THRESHOLD]: windowDef.burnRateThreshold,
              [ALERT_EVALUATION_VALUE]: Math.min(longWindowBurnRate, shortWindowBurnRate),
              [ALERT_GROUP]: groups,
              [ALERT_GROUPING]: groupings, // Object, example: { host: { name: 'host-0' } }
              [SLO_ID_FIELD]: slo.id,
              [SLO_REVISION_FIELD]: slo.revision,
              [SLO_INSTANCE_ID_FIELD]: instanceId,
              [SLO_DATA_VIEW_ID_FIELD]: slo.indicator.params.dataViewId,
              ...getEcsGroupsFromFlattenGrouping(groupingsFlattened),
              ...apmFields,
            },
          });

          const alertDetailsUrl = await getAlertDetailsUrl(basePath, spaceId, uuid);

          const context = {
            alertDetailsUrl,
            reason,
            longWindow: { burnRate: longWindowBurnRate, duration: longWindowDuration.format() },
            shortWindow: { burnRate: shortWindowBurnRate, duration: shortWindowDuration.format() },
            burnRateThreshold: windowDef.burnRateThreshold,
            timestamp: startedAt.toISOString(),
            viewInAppUrl,
            sloId: slo.id,
            sloName: slo.name,
            sloInstanceId: instanceId,
            slo,
            sliValue: sloSummary?.sliValue ?? -1,
            sloStatus: sloSummary?.status ?? 'NO_DATA',
            sloErrorBudgetRemaining: sloSummary?.errorBudgetRemaining ?? 1,
            sloErrorBudgetConsumed: sloSummary?.errorBudgetConsumed ?? 0,
            suppressedAction: shouldSuppress ? windowDef.actionGroup : null,
            grouping: groupings,
          };

          alertsClient.setAlertData({ id: alertId, context });
          scheduledActionsCount++;
        }
      }

      alertsClient.setAlertLimitReached(hasReachedLimit);
    }

    const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];

    for (const recoveredAlert of recoveredAlerts) {
      const alertId = recoveredAlert.alert.getId();
      const alertUuid = recoveredAlert.alert.getUuid();
      const alertDetailsUrl = await getAlertDetailsUrl(basePath, spaceId, alertUuid);

      // Handle recovery for no-data alert differently
      if (alertId === `${slo.id}-no-sli-data`) {
        const context = {
          timestamp: startedAt.toISOString(),
          viewInAppUrl: addSpaceIdToPath(
            basePath.publicBaseUrl,
            spaceId,
            `/app/observability/slos/${slo.id}`
          ),
          alertDetailsUrl,
          sloId: slo.id,
          sloName: slo.name,
          sloInstanceId: ALL_VALUE,
          grouping: recoveredAlert.hit?.[ALERT_GROUPING],
        };
        alertsClient.setAlertData({
          id: alertId,
          context,
        });
      } else {
        // Handle recovery for regular burn rate alerts
        const urlQuery = alertId === ALL_VALUE ? '' : `?instanceId=${alertId}`;
        const viewInAppUrl = addSpaceIdToPath(
          basePath.publicBaseUrl,
          spaceId,
          `/app/observability/slos/${slo.id}${urlQuery}`
        );

        const context = {
          timestamp: startedAt.toISOString(),
          viewInAppUrl,
          alertDetailsUrl,
          sloId: slo.id,
          sloName: slo.name,
          sloInstanceId: alertId,
          grouping: recoveredAlert.hit?.[ALERT_GROUPING],
        };

        alertsClient.setAlertData({
          id: alertId,
          context,
        });
      }
    }

    return { state: {} };
  };

async function checkSliAndSourceData(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  alertsClient: AlertsClient,
  spaceId: string,
  basePath: IBasePath,
  startedAt: Date,
  getTimeRange: GetTimeRange,
  logger: Logger,
  dataViews: DataViewsContract
): Promise<boolean> {
  const { dateStart, dateEnd } = getTimeRange('1h');
  const timeRange = {
    from: new Date(dateStart),
    to: new Date(dateEnd),
  };

  // Check for SLI data in the past 1 hour
  const sliIndexPattern = `.slo-observability.sli-v${SLO_RESOURCES_VERSION_MAJOR}*`;
  const sliDataCount = await esClient.count({
    index: sliIndexPattern,
    query: {
      bool: {
        filter: [
          { term: { 'slo.id': slo.id } },
          { term: { 'slo.revision': slo.revision } },
          {
            range: {
              '@timestamp': {
                gte: timeRange.from.toISOString(),
                lte: timeRange.to.toISOString(),
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
  });

  if (sliDataCount.count > 0) {
    // SLI data exists, proceed with burn rate evaluation
    return true;
  }

  // No SLI data, check if source data exists
  try {
    const sourceQuery = await buildSourceDataQuery(
      slo,
      timeRange,
      dataViews,
      spaceId,
      false // isServerless - could be made configurable if needed
    );

    const sourceDataCount = await esClient.count({
      index: sourceQuery.index,
      query: sourceQuery.query,
    });

    if (sourceDataCount.count > 0) {
      // Source data exists but no SLI data, trigger "no data" alert
      const reason = i18n.translate('xpack.slo.alerting.burnRate.noSliDataReason', {
        defaultMessage:
          'No SLI data generated for SLO {sloName} in the past hour. Source data exists but transform may not be running correctly.',
        values: { sloName: slo.name },
      });

      const alertId = `${slo.id}-no-sli-data`;
      const urlQuery = '';
      const viewInAppUrl = addSpaceIdToPath(
        basePath.publicBaseUrl,
        spaceId,
        `/app/observability/slos/${slo.id}${urlQuery}`
      );

      const { uuid } = alertsClient.report({
        id: alertId,
        actionGroup: NO_SLI_DATA_ACTIONS_ID,
        state: {
          alertState: AlertStates.NO_DATA,
        },
        payload: {
          [ALERT_REASON]: reason,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: ALL_VALUE,
          [SLO_DATA_VIEW_ID_FIELD]: slo.indicator.params.dataViewId || '',
        },
      });

      const alertDetailsUrl = await getAlertDetailsUrl(basePath, spaceId, uuid);

      const context = {
        alertDetailsUrl,
        reason,
        timestamp: startedAt.toISOString(),
        viewInAppUrl,
        sloId: slo.id,
        sloName: slo.name,
        sloInstanceId: ALL_VALUE,
        slo,
      };

      alertsClient.setAlertData({ id: alertId, context });

      return false; // No SLI data, "no data" alert triggered
    }
  } catch (error) {
    logger.warn(`Failed to check source data for SLO ${slo.id}: ${error.message}`);
    // If we can't check source data, proceed with evaluation to avoid blocking
    return true;
  }

  // No SLI data and no source data, proceed with evaluation (this is expected if there's truly no data)
  return true;
}

function getActionGroupName(id: string) {
  switch (id) {
    case HIGH_PRIORITY_ACTION.id:
      return HIGH_PRIORITY_ACTION.name;
    case MEDIUM_PRIORITY_ACTION.id:
      return MEDIUM_PRIORITY_ACTION.name;
    case LOW_PRIORITY_ACTION.id:
      return LOW_PRIORITY_ACTION.name;
    default:
      return ALERT_ACTION.name;
  }
}

function buildReason(
  instanceId: string,
  actionGroup: string,
  longWindowDuration: Duration,
  longWindowBurnRate: number,
  shortWindowDuration: Duration,
  shortWindowBurnRate: number,
  windowDef: WindowSchema,
  suppressed: boolean
) {
  const actionGroupName = suppressed
    ? `${upperCase(SUPPRESSED_PRIORITY_ACTION.name)} - ${upperCase(
        getActionGroupName(actionGroup)
      )}`
    : upperCase(getActionGroupName(actionGroup));
  if (instanceId === ALL_VALUE) {
    return i18n.translate('xpack.slo.alerting.burnRate.reason', {
      defaultMessage:
        '{actionGroupName}: The burn rate for the past {longWindowDuration} is {longWindowBurnRate} and for the past {shortWindowDuration} is {shortWindowBurnRate}. Alert when above {burnRateThreshold} for both windows',
      values: {
        actionGroupName,
        longWindowDuration: longWindowDuration.format(),
        longWindowBurnRate: numeral(longWindowBurnRate).format('0.[00]'),
        shortWindowDuration: shortWindowDuration.format(),
        shortWindowBurnRate: numeral(shortWindowBurnRate).format('0.[00]'),
        burnRateThreshold: windowDef.burnRateThreshold,
      },
    });
  }
  return i18n.translate('xpack.slo.alerting.burnRate.reasonForInstanceId', {
    defaultMessage:
      '{actionGroupName}: The burn rate for the past {longWindowDuration} is {longWindowBurnRate} and for the past {shortWindowDuration} is {shortWindowBurnRate} for {instanceId}. Alert when above {burnRateThreshold} for both windows',
    values: {
      actionGroupName,
      longWindowDuration: longWindowDuration.format(),
      longWindowBurnRate: numeral(longWindowBurnRate).format('0.[00]'),
      shortWindowDuration: shortWindowDuration.format(),
      shortWindowBurnRate: numeral(shortWindowBurnRate).format('0.[00]'),
      burnRateThreshold: windowDef.burnRateThreshold,
      instanceId,
    },
  });
}

function extractApmFieldsFromSLOSummary(
  sloSummary: EsSummaryDocument | undefined
): Record<string, string> {
  const apmFields: Record<string, string> = {};

  if (sloSummary) {
    if (sloSummary.service?.name) {
      apmFields['service.name'] = sloSummary.service.name;
    }
    if (sloSummary.service?.environment) {
      apmFields['service.environment'] = sloSummary.service.environment;
    }
    if (sloSummary.transaction?.name) {
      apmFields['transaction.name'] = sloSummary.transaction.name;
    }
    if (sloSummary.transaction?.type) {
      apmFields['transaction.type'] = sloSummary.transaction.type;
    }
  }

  return apmFields;
}
