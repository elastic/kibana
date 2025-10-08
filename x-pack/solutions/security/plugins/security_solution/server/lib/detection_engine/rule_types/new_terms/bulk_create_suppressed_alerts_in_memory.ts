/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityRuleServices,
  SearchAfterAndBulkCreateReturnType,
  SecuritySharedParams,
} from '../types';

import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../common/detection_engine/constants';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';

import { executeBulkCreateAlerts } from '../utils/bulk_create_suppressed_alerts_in_memory';
import type {
  DetectionAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';
import { partitionMissingFieldsEvents } from '../utils/partition_missing_fields_events';
import type { EventsAndTerms } from './types';
import { wrapNewTermsAlerts } from './wrap_new_terms_alerts';
import { wrapSuppressedNewTermsAlerts } from './wrap_suppressed_new_terms_alerts';
import type { NewTermsRuleParams } from '../../rule_schema';

export interface BulkCreateSuppressedAlertsParams {
  services: SecurityRuleServices;
  alertSuppression: AlertSuppressionCamel;
  sharedParams: SecuritySharedParams<NewTermsRuleParams>;
  eventsAndTerms: EventsAndTerms[];
  toReturn: SearchAfterAndBulkCreateReturnType;
}
/**
 * wraps, bulk create and suppress alerts in memory, also takes care of missing fields logic.
 * If parameter alertSuppression.missingFieldsStrategy configured not to be suppressed, regular alerts will be created for such events without suppression
 * This function is similar to x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/utils/bulk_create_suppressed_alerts_in_memory.ts, but
 * it operates with new terms specific eventsAndTerms{@link EventsAndTerms} parameter property, instead of regular events as common utility
 */
export const bulkCreateSuppressedNewTermsAlertsInMemory = async ({
  sharedParams,
  eventsAndTerms,
  toReturn,
  services,
  alertSuppression,
}: BulkCreateSuppressedAlertsParams) => {
  const suppressOnMissingFields =
    (alertSuppression.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY) ===
    AlertSuppressionMissingFieldsStrategyEnum.suppress;

  let suppressibleEvents = eventsAndTerms;
  let unsuppressibleWrappedDocs: Array<WrappedAlert<DetectionAlertLatest>> = [];

  if (!suppressOnMissingFields) {
    const partitionedEvents = partitionMissingFieldsEvents(
      eventsAndTerms,
      alertSuppression.groupBy || [],
      ['event', 'fields']
    );

    unsuppressibleWrappedDocs = wrapNewTermsAlerts({
      sharedParams,
      eventsAndTerms: partitionedEvents[1],
    });

    suppressibleEvents = partitionedEvents[0];
  }

  const suppressibleWrappedDocs = wrapSuppressedNewTermsAlerts({
    sharedParams,
    eventsAndTerms: suppressibleEvents,
  });

  return executeBulkCreateAlerts({
    sharedParams,
    suppressibleWrappedDocs,
    unsuppressibleWrappedDocs,
    toReturn,
    services,
    alertSuppression,
  });
};
