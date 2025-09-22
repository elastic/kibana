/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  RuleTypeParams,
  SanitizedRuleConfig,
} from '@kbn/alerting-plugin/common';
import type { PublicAlertsClient } from '@kbn/alerting-plugin/server/alerts_client/types';
import { mapKeys, snakeCase } from 'lodash';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import type { SecurityActionGroupId } from '../types';
import { filterDuplicateAlerts } from './filter_duplicate_alerts';
import { augmentAlerts } from './augment_alerts';
import { getViewInAppRelativeUrl } from '../create_security_rule_type_wrapper';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
// eslint-disable-next-line no-restricted-imports
import { formatAlertForNotificationActions } from '../../rule_actions_legacy/logic/notifications/schedule_notification_actions';
import { errorAggregator } from './error_aggregator';

export interface GenericAlert<T> {
  _id: string;
  _source: T;
}

interface AlertWithPersistenceOpts<T, TParams extends RuleTypeParams> {
  alertsClient: PublicAlertsClient<
    RuleAlertData,
    AlertInstanceState,
    AlertInstanceContext,
    SecurityActionGroupId
  > | null;
  alerts: Array<GenericAlert<T>>;
  enrichAlerts?: (
    alerts: Array<GenericAlert<T>>,
    params: { spaceId: string }
  ) => Promise<Array<GenericAlert<T>>>;
  logger: IRuleExecutionLogForExecutors;
  maxAlerts?: number;
  rule: SanitizedRuleConfig;
  ruleParams: TParams;
  spaceId: string;
}

export const alertWithPersistence = async <T, TParams extends RuleTypeParams>(
  opts: AlertWithPersistenceOpts<T, TParams>
) => {
  const { alerts, alertsClient, enrichAlerts, logger, maxAlerts, rule, ruleParams, spaceId } = opts;

  if (!alertsClient) {
    throw new AlertsClientError();
  }

  logger.info(`alertWithPersistence rule: ${JSON.stringify(rule)}`);
  logger.info(`alertWithPersistence ruleParams: ${JSON.stringify(ruleParams)}`);

  const numAlerts = alerts.length;

  logger.debug(`Found ${numAlerts} alerts.`);

  if (numAlerts > 0) {
    logger.info(`alertWithPersistence alerts ${JSON.stringify(alerts)}`);
    const filteredAlerts: typeof alerts = await filterDuplicateAlerts({
      alerts,
      alertsClient,
    });
    logger.info(`alertWithPersistence filtered alerts ${JSON.stringify(filteredAlerts)}`);

    if (filteredAlerts.length === 0) {
      return { createdAlerts: [], errors: {}, alertsWereTruncated: false };
    } else if (maxAlerts === 0) {
      return { createdAlerts: [], errors: {}, alertsWereTruncated: true };
    }

    let enrichedAlerts = filteredAlerts;
    if (enrichAlerts) {
      try {
        enrichedAlerts = await enrichAlerts(filteredAlerts, {
          spaceId,
        });
        logger.info(`alertWithPersistence enriched alerts ${JSON.stringify(enrichedAlerts)}`);
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
      currentTimeOverride: undefined,
    });
    logger.info(`alertWithPersistence augmented alerts ${JSON.stringify(augmentedAlerts)}`);

    // const response = await ruleDataClientWriter.bulk({
    //   body: mapAlertsToBulkCreate(augmentedAlerts),
    //   refresh,
    // });

    // if (response == null) {
    //   return { createdAlerts: [], errors: {}, alertsWereTruncated };
    // }

    // why do we write building block alerts but don't report building block alerts?
    // don't want notifications about it but we want the alerts
    // const createdAlerts = augmentedAlerts
    //   .map((alert, idx) => {
    //     const responseItem = response.body.items[idx].create;
    //     return {
    //       _id: responseItem?._id ?? '',
    //       _index: responseItem?._index ?? '',
    //       ...alert._source,
    //     };
    //   })
    //   .filter((_, idx) => response.body.items[idx].create?.status === 201)
    //   // Security solution's EQL rule consists of building block alerts which should be filtered out.
    //   // Building block alerts have additional "kibana.alert.group.index" attribute which is absent for the root alert.
    //   .filter((alert) => !Object.keys(alert).includes(ALERT_GROUP_INDEX));

    // report alerts
    // persist the alerts, without the processing of the alerting framework
    // return the created alerts
    // set the alert context, including the actual alert information
    augmentedAlerts.forEach((alert) => {
      logger.info(`alertWithPersistence reporting alert ${alert._id}`);
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
      return { createdAlerts: [], errors: {}, alertsWereTruncated };
    }

    const createdAlerts = (flushResponse ?? [])
      .filter(({ response }) => response?.create?.status === 201)
      .map(({ alert, response }) => ({
        _id: response?.create?._id ?? '',
        _index: response?.create?._index ?? '',
        ...alert,
      }));

    logger.info(`alertWithPersistence createdAlerts ${JSON.stringify(createdAlerts)}`);

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
      errors: errorAggregator(
        flushResponse.map(({ response }) => response),
        [409]
      ),
      alertsWereTruncated,
    };
  } else {
    return { createdAlerts: [], errors: {}, alertsWereTruncated: false };
  }
};
