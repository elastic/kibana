/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

export const logExecutionTotals = (
  logger: IRuleExecutionLogForExecutors,
  result: {
    ruleType: string;
    totalEventsFound?: number;
    suppressedAlertsCount?: number;
    createdSignalsCount: number;
  }
) => {
  const { ruleType, totalEventsFound, suppressedAlertsCount = 0, createdSignalsCount } = result;

  if (totalEventsFound != null) {
    logger.info(`Found matching events: ${totalEventsFound}`);
  }

  // Indicator Match rules re-process the same source events across indicator
  // pages, inflating suppression/unaccounted counts. Skipping these metrics for IM.
  if (ruleType !== 'threat_match') {
    if (suppressedAlertsCount > 0) {
      logger.info(`Alerts suppressed: ${suppressedAlertsCount}`);
    }

    if (totalEventsFound != null && totalEventsFound > 0) {
      const unaccountedEvents = totalEventsFound - createdSignalsCount - suppressedAlertsCount;
      if (unaccountedEvents > 0) {
        logger.info(
          `Events that did not result in alerts: ${unaccountedEvents}\nThis is typically because alerts for these events already exist from a previous rule execution, or events were excluded by value list exceptions. This number doesn't include suppressed alerts.`
        );
      }
    }
  }

  logger.info(`Alerts created: ${createdSignalsCount}`);
};
