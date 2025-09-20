/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  RuleTypeParams,
  SanitizedRuleConfig,
} from '@kbn/alerting-plugin/common';
import type { PublicAlertsClient } from '@kbn/alerting-plugin/server/alerts_client/types';
import { mapKeys, partition, snakeCase, sortBy } from 'lodash';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import {
  ALERT_SUPPRESSION_START,
  ALERT_INSTANCE_ID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_START,
  ALERT_WORKFLOW_STATUS,
  TIMESTAMP,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_LAST_DETECTED,
} from '@kbn/rule-data-utils';
import type { IUiSettingsClient } from '@kbn/core/server';
import { SECURITY_SOLUTION_SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING } from '@kbn/management-settings-ids';
import type { estypes } from '@elastic/elasticsearch';
import type { Alert, SecurityAlert } from '@kbn/alerts-as-data-utils';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { SecurityActionGroupId } from '../types';
import { filterDuplicateAlerts } from './filter_duplicate_alerts';
import { augmentAlerts } from './augment_alerts';
import { getViewInAppRelativeUrl } from '../create_security_rule_type_wrapper';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
// eslint-disable-next-line no-restricted-imports
import { formatAlertForNotificationActions } from '../../rule_actions_legacy/logic/notifications/schedule_notification_actions';
import { errorAggregator } from './error_aggregator';
import type { GenericAlert } from './alert_with_persistence';
import type { CommonAlertFields870, SuppressionFields870 } from './utils/schema';

export type BackendAlertWithSuppressionFields870 = Omit<
  SuppressionFields870,
  typeof ALERT_SUPPRESSION_START | typeof ALERT_SUPPRESSION_END
> & {
  [ALERT_SUPPRESSION_START]: string;
  [ALERT_SUPPRESSION_END]: string;
} & CommonAlertFields870;

export interface GenericAlertWithSubAlert<T> {
  _id: string;
  _source: T;
  subAlerts?: Array<{ _id: string; _source: T }>;
}

interface AlertWithSuppressionOpts<T extends SecurityAlert, TParams extends RuleTypeParams> {
  alertsClient: PublicAlertsClient<
    RuleAlertData,
    AlertInstanceState,
    AlertInstanceContext,
    SecurityActionGroupId
  > | null;
  alerts: Array<GenericAlertWithSubAlert<T>>;
  suppressionWindow: string;
  enrichAlerts?: (
    alerts: Array<GenericAlert<T>>,
    params: { spaceId: string }
  ) => Promise<Array<GenericAlert<T>>>;
  executionId: string;
  logger: IRuleExecutionLogForExecutors;
  maxAlerts?: number;
  rule: SanitizedRuleConfig;
  ruleParams: TParams;
  spaceId: string;
  currentTimeOverride?: Date;
  isRuleExecutionOnly?: boolean;
  uiSettingsClient: IUiSettingsClient;
}

export const alertWithSuppression = async <T extends SecurityAlert, TParams extends RuleTypeParams>(
  opts: AlertWithSuppressionOpts<T, TParams>
) => {
  const {
    alerts,
    alertsClient,
    currentTimeOverride,
    enrichAlerts,
    executionId,
    isRuleExecutionOnly,
    logger,
    maxAlerts,
    rule,
    ruleParams,
    spaceId,
    suppressionWindow,
    uiSettingsClient,
  } = opts;

  if (!alertsClient) {
    throw new AlertsClientError();
  }

  logger.info(`alertWithSuppression rule: ${JSON.stringify(rule)}`);
  logger.info(`alertWithSuppression ruleParams: ${JSON.stringify(ruleParams)}`);

  const numAlerts = alerts.length;

  logger.debug(`Found ${numAlerts} alerts.`);

  if (numAlerts > 0) {
    logger.info(`alertWithSuppression alerts ${JSON.stringify(alerts)}`);

    const suppressionWindowStart = dateMath.parse(suppressionWindow, {
      forceNow: currentTimeOverride,
    });

    if (!suppressionWindowStart) {
      throw new Error('Failed to parse suppression window');
    }

    const filteredAlerts: typeof alerts = await filterDuplicateAlerts({
      alerts,
      alertsClient,
    });
    logger.info(`alertWithSuppression filtered alerts ${JSON.stringify(filteredAlerts)}`);

    if (filteredAlerts.length === 0) {
      return { createdAlerts: [], suppressedAlerts: [], errors: {}, alertsWereTruncated: false };
    }

    const suppressionBehaviorOnAlertClosure = await uiSettingsClient.get(
      SECURITY_SOLUTION_SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING
    );

    const shouldExcludeClosedAlerts =
      suppressionBehaviorOnAlertClosure !== 'continue-until-window-ends';

    const suppressionAlertSearchRequest: estypes.SearchRequest = {
      size: filteredAlerts.length,
      query: {
        bool: {
          filter: [
            {
              range: {
                [ALERT_START]: {
                  gte: suppressionWindowStart.toISOString(),
                },
              },
            },
            {
              terms: {
                [ALERT_INSTANCE_ID]: filteredAlerts.map(
                  (alert) => alert._source[ALERT_INSTANCE_ID]
                ),
              },
            },
            ...(shouldExcludeClosedAlerts
              ? [
                  {
                    bool: {
                      must_not: {
                        term: {
                          [ALERT_WORKFLOW_STATUS]: 'closed',
                        },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      },
      collapse: {
        field: ALERT_INSTANCE_ID,
      },
      sort: [
        {
          [ALERT_START]: {
            order: 'desc' as const,
          },
        },
      ],
    };

    const searchResponse = await alertsClient.search(suppressionAlertSearchRequest);

    const existingAlertsByInstanceId = searchResponse.hits.reduce<
      Record<string, SearchHit<SecurityAlert & Alert>>
    >((acc, hit) => {
      const alertId = hit._source?.[ALERT_INSTANCE_ID];
      if (alertId) {
        acc[alertId] = hit;
      }
      return acc;
    }, {});

    // filter out alerts that were already suppressed
    // alert was suppressed if its suppression ends is older
    // than suppression end of existing alert
    // if existing alert was created earlier during the same
    // rule execution - then alerts can be counted as not suppressed yet
    // as they are processed for the first time against this existing alert
    const nonSuppressedAlerts = filteredAlerts.filter((alert) => {
      const existingAlert = existingAlertsByInstanceId[alert._source[ALERT_INSTANCE_ID]];

      if (!existingAlert || existingAlert?._source?.[ALERT_RULE_EXECUTION_UUID] === executionId) {
        return true;
      }

      return !isExistingDateGtEqThanAlert(existingAlert, alert, ALERT_SUPPRESSION_END);
    });

    if (nonSuppressedAlerts.length === 0) {
      return {
        createdAlerts: [],
        errors: {},
        suppressedAlerts: [],
        alertsWereTruncated: false,
      };
    }

    const { alertCandidates, suppressedAlerts: suppressedInMemoryAlerts } =
      suppressAlertsInMemory(nonSuppressedAlerts);

    const [duplicateAlerts, newAlerts] = partition(alertCandidates, (alert) => {
      const existingAlert = existingAlertsByInstanceId[alert._source[ALERT_INSTANCE_ID]];

      // if suppression enabled only on rule execution, we need to suppress alerts only against
      // alert created in the same rule execution. Otherwise, we need to create a new alert to accommodate per rule execution suppression
      if (isRuleExecutionOnly) {
        return existingAlert?._source?.[ALERT_RULE_EXECUTION_UUID] === executionId;
      } else {
        return existingAlert != null;
      }
    });

    // const duplicateAlertUpdates = duplicateAlerts.flatMap((alert) => {
    //   const existingAlert = existingAlertsByInstanceId[alert._source[ALERT_INSTANCE_ID]];
    //   const existingDocsCount = existingAlert._source?.[ALERT_SUPPRESSION_DOCS_COUNT] ?? 0;

    //   return [
    //     {
    //       update: {
    //         _id: existingAlert._id,
    //         _index: existingAlert._index,
    //         require_alias: false,
    //       },
    //     },
    //     {
    //       doc: {
    //         ...getUpdatedSuppressionBoundaries(existingAlert, alert, executionId),
    //         [ALERT_LAST_DETECTED]: currentTimeOverride ?? new Date(),
    //         [ALERT_SUPPRESSION_DOCS_COUNT]:
    //           existingDocsCount + alert._source[ALERT_SUPPRESSION_DOCS_COUNT] + 1,
    //       },
    //     },
    //   ];
    // });

    // we can now augment and enrich
    // the sub alerts (if any) the same as we would
    // any other newAlert
    let enrichedAlerts = newAlerts.some((newAlert) => newAlert.subAlerts != null)
      ? newAlerts.flatMap((newAlert) => {
          const { subAlerts, ...everything } = newAlert;
          return [everything, ...(subAlerts ?? [])];
        })
      : newAlerts;
    if (enrichAlerts) {
      try {
        enrichedAlerts = await enrichAlerts(enrichedAlerts, {
          spaceId,
        });
        logger.info(`alertWithSuppression enriched alerts ${JSON.stringify(enrichedAlerts)}`);
      } catch (e) {
        logger.debug('Enrichments failed');
      }
    }

    let alertsWereTruncated = false;
    if (maxAlerts && enrichedAlerts.length > maxAlerts) {
      enrichedAlerts.length = maxAlerts;
      alertsWereTruncated = true;
    }

    const augmentedAlerts = await augmentAlerts({
      alerts: enrichedAlerts,
      currentTimeOverride,
    });
    logger.info(`alertWithSuppression augmented alerts ${JSON.stringify(augmentedAlerts)}`);

    // report duplicate alerts, they will be categorized as ongoing and updated
    duplicateAlerts.forEach((update) => {
      logger.info(`alertWithSuppression updating suppressed alert ${JSON.stringify(update)}`);
      const existingAlert = existingAlertsByInstanceId[update._source[ALERT_INSTANCE_ID]];
      const existingDocsCount = existingAlert._source?.[ALERT_SUPPRESSION_DOCS_COUNT] ?? 0;
      if (existingAlert && existingAlert._id) {
        alertsClient.report({
          id: existingAlert._id,
          actionGroup: 'default',
          payload: {
            ...getUpdatedSuppressionBoundaries(existingAlert, update, executionId),
            [ALERT_LAST_DETECTED]: currentTimeOverride ?? new Date(),
            [ALERT_SUPPRESSION_DOCS_COUNT]:
              existingDocsCount + update._source[ALERT_SUPPRESSION_DOCS_COUNT] + 1,
          },
        });
      }
    });

    // report new alerts
    augmentedAlerts.forEach((alert) => {
      logger.info(`alertWithSuppression reporting alert ${alert._id}`);
      alertsClient.report({
        id: alert._id,
        uuid: alert._id,
        actionGroup: 'default',
        state: { signals_count: 1 },
        payload: { ...alert._source },
      });
    });

    const flushResponse = await alertsClient.flushAlerts();

    if (!flushResponse) {
      return { createdAlerts: [], suppressedAlerts: [], errors: {}, alertsWereTruncated };
    }

    const createdAlerts = (flushResponse ?? [])
      .filter(({ response }) => response?.create?.status === 201)
      .map(({ alert, response }) => ({
        _id: response?.create?._id ?? '',
        _index: response?.create?._index ?? '',
        ...alert,
      }));

    logger.info(`alertWithSuppression createdAlerts ${JSON.stringify(createdAlerts)}`);

    createdAlerts.forEach((alert) => {
      alertsClient.setAlertData({
        id: alert._id,
        context: {
          rule: mapKeys(snakeCase, {
            ...ruleParams,
            name: rule.name,
            id: rule.id,
          }),
          results_link: getViewInAppRelativeUrl({
            rule: { ...rule, params: ruleParams },
            start: Date.parse(alert[TIMESTAMP] as string),
            end: Date.parse(alert[TIMESTAMP] as string),
          }),
          alerts: [formatAlertForNotificationActions(alert) ?? alert],
        },
      });
    });

    return {
      createdAlerts,
      suppressedAlerts: [...duplicateAlerts, ...suppressedInMemoryAlerts],
      errors: errorAggregator(
        flushResponse.map(({ response: resp }) => resp),
        [409]
      ),
      alertsWereTruncated,
    };
  } else {
    return { createdAlerts: [], suppressedAlerts: [], errors: {}, alertsWereTruncated: false };
  }
};

/**
 * suppress alerts by ALERT_INSTANCE_ID in memory
 */
export const suppressAlertsInMemory = <
  T extends {
    _id: string;
    _source: {
      [ALERT_SUPPRESSION_DOCS_COUNT]: number;
      [ALERT_INSTANCE_ID]: string;
      [ALERT_SUPPRESSION_START]: Date;
      [ALERT_SUPPRESSION_END]: Date;
    };
  }
>(
  alerts: T[]
): {
  alertCandidates: T[];
  suppressedAlerts: T[];
} => {
  const idsMap: Record<string, { count: number; suppressionEnd: Date }> = {};
  const suppressedAlerts: T[] = [];

  const filteredAlerts = sortBy(alerts, (alert) => alert._source[ALERT_SUPPRESSION_START]).filter(
    (alert) => {
      const instanceId = alert._source[ALERT_INSTANCE_ID];
      const suppressionDocsCount = alert._source[ALERT_SUPPRESSION_DOCS_COUNT];
      const suppressionEnd = alert._source[ALERT_SUPPRESSION_END];

      if (instanceId && idsMap[instanceId] != null) {
        idsMap[instanceId].count += suppressionDocsCount + 1;
        // store the max value of suppression end boundary
        if (suppressionEnd > idsMap[instanceId].suppressionEnd) {
          idsMap[instanceId].suppressionEnd = suppressionEnd;
        }
        suppressedAlerts.push(alert);
        return false;
      } else {
        idsMap[instanceId] = { count: suppressionDocsCount, suppressionEnd };
        return true;
      }
    },
    []
  );

  const alertCandidates = filteredAlerts.map((alert) => {
    const instanceId = alert._source[ALERT_INSTANCE_ID];
    if (instanceId) {
      alert._source[ALERT_SUPPRESSION_DOCS_COUNT] = idsMap[instanceId].count;
      alert._source[ALERT_SUPPRESSION_END] = idsMap[instanceId].suppressionEnd;
    }
    return alert;
  });

  return {
    alertCandidates,
    suppressedAlerts,
  };
};

/**
 * Compare existing alert suppression date props with alert to suppressed alert values
 **/
export const isExistingDateGtEqThanAlert = <T extends SecurityAlert>(
  existingAlert: estypes.SearchHit<SecurityAlert>,
  alert: GenericAlertWithSubAlert<T>,
  property: typeof ALERT_SUPPRESSION_END | typeof ALERT_SUPPRESSION_START
) => {
  const existingDate = existingAlert?._source?.[property];
  return existingDate ? existingDate >= alert._source[property].toISOString() : false;
};

interface SuppressionBoundaries {
  [ALERT_SUPPRESSION_END]: Date;
  [ALERT_SUPPRESSION_START]: Date;
}

/**
 * returns updated suppression time boundaries
 */
export const getUpdatedSuppressionBoundaries = <T extends SecurityAlert>(
  existingAlert: SearchHit<T>,
  alert: GenericAlertWithSubAlert<T>,
  executionId: string
): Partial<SuppressionBoundaries> => {
  const boundaries: Partial<SuppressionBoundaries> = {};

  if (!isExistingDateGtEqThanAlert(existingAlert, alert, ALERT_SUPPRESSION_END)) {
    boundaries[ALERT_SUPPRESSION_END] = alert._source[ALERT_SUPPRESSION_END];
  }
  // start date can only be updated for alert created in the same rule execution
  // it can happen when alert was created in first bulk created, but some of the alerts can be suppressed in the next bulk create request
  if (
    existingAlert?._source?.[ALERT_RULE_EXECUTION_UUID] === executionId &&
    isExistingDateGtEqThanAlert(existingAlert, alert, ALERT_SUPPRESSION_START)
  ) {
    boundaries[ALERT_SUPPRESSION_START] = alert._source[ALERT_SUPPRESSION_START];
  }

  return boundaries;
};
