/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { isEmpty } from 'lodash';
import type { Type as RuleType } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  AlertWithCommonFieldsLatest,
  SuppressionFieldsLatest,
} from '@kbn/rule-registry-plugin/common/schemas';

import { isQueryRule } from '../../../../../common/detection_engine/utils';
import { makeFloatString } from './utils';
import type {
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { SecurityRuleServices, SecuritySharedParams } from '../types';
import { getNumberOfSuppressedAlerts } from './get_number_of_suppressed_alerts';
import type { EnrichEventsWrapper } from './enrichments/types';
import { enrichEvents } from './enrichments';

export interface GenericBulkCreateResponse<T extends DetectionAlertLatest> {
  success: boolean;
  bulkCreateDuration: string;
  enrichmentDuration: string;
  createdItemsCount: number;
  suppressedItemsCount: number;
  createdItems: Array<AlertWithCommonFieldsLatest<T> & { _id: string; _index: string }>;
  errors: string[];
  alertsWereTruncated: boolean;
}

export const bulkCreateWithSuppression = async <
  T extends SuppressionFieldsLatest & DetectionAlertLatest
>({
  sharedParams,
  wrappedDocs,
  services,
  suppressionWindow,
  isSuppressionPerRuleExecution,
  maxAlerts,
  ruleType,
}: {
  sharedParams: SecuritySharedParams;
  wrappedDocs: Array<WrappedAlert<T> & { subAlerts?: Array<WrappedAlert<T>> }>;
  services: SecurityRuleServices;
  suppressionWindow: string;
  isSuppressionPerRuleExecution?: boolean;
  maxAlerts?: number;
  ruleType?: RuleType;
}): Promise<GenericBulkCreateResponse<T>> => {
  const { ruleExecutionLogger, alertTimestampOverride } = sharedParams;
  if (wrappedDocs.length === 0) {
    return {
      errors: [],
      success: true,
      enrichmentDuration: '0',
      bulkCreateDuration: '0',
      createdItemsCount: 0,
      suppressedItemsCount: 0,
      createdItems: [],
      alertsWereTruncated: false,
    };
  }

  const start = performance.now();

  let enrichmentsTimeStart = 0;
  let enrichmentsTimeFinish = 0;
  const enrichAlertsWrapper: EnrichEventsWrapper = async (alerts, params) => {
    enrichmentsTimeStart = performance.now();
    try {
      const enrichedAlerts = await enrichEvents({
        services,
        logger: sharedParams.ruleExecutionLogger,
        events: alerts,
        spaceId: params.spaceId,
      });
      return enrichedAlerts;
    } catch (error) {
      ruleExecutionLogger.error(`Alerts enrichment failed: ${error}`);
      throw error;
    } finally {
      enrichmentsTimeFinish = performance.now();
    }
  };

  const alerts = wrappedDocs.map((doc) => ({
    _id: doc._id,
    // `fields` should have already been merged into `doc._source`
    _source: doc._source,
    subAlerts:
      doc?.subAlerts != null
        ? doc?.subAlerts?.map((subAlert) => ({ _id: subAlert._id, _source: subAlert._source }))
        : undefined,
  }));

  const { createdAlerts, errors, suppressedAlerts, alertsWereTruncated } =
    await services.alertWithSuppression(
      alerts,
      suppressionWindow,
      enrichAlertsWrapper,
      alertTimestampOverride,
      isSuppressionPerRuleExecution,
      maxAlerts
    );

  const end = performance.now();

  ruleExecutionLogger.debug(`Alerts bulk process took ${makeFloatString(end - start)} ms`);

  // query rule type suppression does not happen in memory, so we can't just count createdAlerts and suppressedAlerts
  // for this rule type we need to look into alerts suppression properties, extract those values and sum up
  const suppressedItemsCount = isQueryRule(ruleType)
    ? getNumberOfSuppressedAlerts(
        createdAlerts,
        suppressedAlerts.map(({ _source, _id }) => ({ _id, ..._source }))
      )
    : suppressedAlerts.length;

  if (!isEmpty(errors)) {
    ruleExecutionLogger.warn(`Alerts bulk process finished with errors: ${JSON.stringify(errors)}`);
    return {
      errors: Object.keys(errors),
      success: false,
      enrichmentDuration: makeFloatString(enrichmentsTimeFinish - enrichmentsTimeStart),
      bulkCreateDuration: makeFloatString(end - start),
      createdItemsCount: createdAlerts.length,
      createdItems: createdAlerts,
      suppressedItemsCount,
      alertsWereTruncated,
    };
  } else {
    return {
      errors: [],
      success: true,
      bulkCreateDuration: makeFloatString(end - start),
      enrichmentDuration: makeFloatString(enrichmentsTimeFinish - enrichmentsTimeStart),
      createdItemsCount: createdAlerts.length,
      createdItems: createdAlerts,
      suppressedItemsCount,
      alertsWereTruncated,
    };
  }
};
