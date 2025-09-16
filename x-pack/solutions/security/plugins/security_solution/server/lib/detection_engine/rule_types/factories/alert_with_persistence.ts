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
  refresh: boolean | 'wait_for';
  rule: SanitizedRuleConfig;
  ruleParams: TParams;
  spaceId: string;
}

export const alertWithPersistence = async <T, TParams extends RuleTypeParams>(
  opts: AlertWithPersistenceOpts<T, TParams>
) => {
  const {
    alerts,
    alertsClient,
    enrichAlerts,
    logger,
    maxAlerts,
    refresh,
    rule,
    ruleParams,
    spaceId,
  } = opts;

  if (!alertsClient) {
    throw new AlertsClientError();
  }

  const numAlerts = alerts.length;

  logger.debug(`Found ${numAlerts} alerts.`);

  if (numAlerts > 0) {
    console.log(`alerts ${JSON.stringify(alerts)}`);
    const filteredAlerts: typeof alerts = await filterDuplicateAlerts({
      alerts,
      alertsClient,
      spaceId,
    });
    console.log(`filtered alerts ${JSON.stringify(filteredAlerts)}`);

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
        console.log(`enriched alerts ${JSON.stringify(enrichedAlerts)}`);
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
    console.log(`augmented alerts ${JSON.stringify(augmentedAlerts)}`);

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
      console.log(`reporting alert ${alert._id}`);
      alertsClient.report({
        id: alert._id,
        uuid: alert._id,
        actionGroup: 'default',
        payload: { ...alert._source },
      });
    });

    const response = await alertsClient.flushAlerts();

    console.log(`flush response ${JSON.stringify(response)}`);

    // augmentedAlerts.forEach((alert) => {
    //   // TODO context.rule doesn't have the rule information
    //   const context = {
    //     rule: mapKeys(snakeCase, {
    //       ...ruleParams,
    //       name: rule.name,
    //       id: rule.id,
    //     }),
    //     results_link: getViewInAppRelativeUrl({
    //       rule: { ...rule.ruleConfig, params: ruleParams },
    //       start: Date.parse(alert._source[TIMESTAMP]),
    //       end: Date.parse(alert._source[TIMESTAMP]),
    //     }),
    //     // doesn't contain the full alert information because it's not yet populated.
    //     // no id, index, and the stuff set in augment alert
    //     alerts: [formatAlertForNotificationActions(alert._source) ?? alert._source],
    //   };
    //   console.log(`reporting alert ${alert._id} with context ${JSON.stringify(context)}`);
    //   alertsClient.report({
    //     id: alert._id,
    //     uuid: alert._id,
    //     actionGroup: 'default',
    //     // context,
    //     payload: { ...alert._source },
    //   });
    // });

    // flush alerts, have to get the response
    // iterate over the response and set the context for each alert

    // createdAlerts.forEach((alert) =>
    //   options.services.alertFactory
    //     .create(alert._id)
    //     .replaceState({
    //       signals_count: 1,
    //     })
    //     .scheduleActions(type.defaultActionGroupId, {
    //       rule: mapKeys(snakeCase, {
    //         ...options.params,
    //         name: options.rule.name,
    //         id: options.rule.id,
    //       }),
    //       results_link: type.getViewInAppRelativeUrl?.({
    //         rule: { ...options.rule, params: options.params },
    //         start: Date.parse(alert[TIMESTAMP]),
    //         end: Date.parse(alert[TIMESTAMP]),
    //       }),
    //       alerts: [formatAlert?.(alert) ?? alert],
    //     })
    // );

    return {
      createdAlerts,
      errors: errorAggregator(response.body, [409]),
      alertsWereTruncated,
    };
  } else {
    return { createdAlerts: [], errors: {}, alertsWereTruncated: false };
  }
};
