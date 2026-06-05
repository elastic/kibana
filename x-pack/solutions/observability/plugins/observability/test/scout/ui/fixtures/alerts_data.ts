/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ALERT_COUNTS, ALERT_TABLE_DATE_RANGE } from './constants';

/**
 * Observability alerts-as-data write alias that Kibana provisions at boot. We
 * index generated alert documents straight into the alias rather than restoring
 * the legacy `observability/alerts` es_archive: Scout only exposes
 * `esArchiver.loadIfNeeded`, which skips indices that already exist — and these
 * indices are always created by Kibana on startup, so the archive would never be
 * ingested.
 */
const OBSERVABILITY_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';

// Matches the rule that produced the active alerts in the legacy archive so the
// rendered table content (reason, rule name, category) stays representative.
export const OBSERVABILITY_ALERT_RULE = {
  category: 'Failed transaction rate threshold',
  consumer: 'alerts',
  producer: 'apm',
  ruleTypeId: 'apm.transaction_error_rate',
  name: 'APM Failed Transaction Rate (one)',
  uuid: '521bd1a0-30ed-11ec-9819-c5cd0facebad',
} as const;

const RULE = OBSERVABILITY_ALERT_RULE;

// Timestamps inside ALERT_TABLE_DATE_RANGE so the default fixed window shows them.
const ALERT_START = '2021-10-19T15:00:41.555Z';
const ALERT_TIMESTAMP = '2021-10-19T15:20:38.749Z';
const ALERT_END = '2021-10-19T15:30:41.555Z';

interface AlertDocOptions {
  index: number;
  status: 'active' | 'recovered';
}

const buildAlertDoc = ({ index, status }: AlertDocOptions) => {
  const isActive = status === 'active';
  return {
    '@timestamp': ALERT_TIMESTAMP,
    'event.action': isActive ? 'active' : 'close',
    'event.kind': 'signal',
    'kibana.alert.status': status,
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.duration.us': 1197194000,
    'kibana.alert.evaluation.threshold': 5,
    'kibana.alert.evaluation.value': 30.7,
    'kibana.alert.instance.id': `scout-instance-${index}`,
    'kibana.alert.uuid': `scout-alert-${status}-${index}`,
    'kibana.alert.reason': `Failed transactions rate is greater than 5.0% (current value is 31%) for elastic-co-frontend (alert ${index})`,
    'kibana.alert.rule.category': RULE.category,
    'kibana.alert.rule.consumer': RULE.consumer,
    'kibana.alert.rule.producer': RULE.producer,
    'kibana.alert.rule.rule_type_id': RULE.ruleTypeId,
    'kibana.alert.rule.name': RULE.name,
    'kibana.alert.rule.uuid': RULE.uuid,
    'kibana.alert.start': ALERT_START,
    'kibana.alert.time_range': isActive
      ? { gte: ALERT_START }
      : { gte: ALERT_START, lte: ALERT_END },
    ...(isActive ? {} : { 'kibana.alert.end': ALERT_END }),
    'kibana.space_ids': ['default'],
    'kibana.version': '8.0.0',
    'processor.event': 'transaction',
    'service.environment': 'production',
    'service.name': 'elastic-co-frontend',
    'transaction.type': 'http-request',
    tags: [],
  };
};

/**
 * Removes any existing Observability alerts and indexes a deterministic set of
 * {@link ALERT_COUNTS.ACTIVE} active + {@link ALERT_COUNTS.RECOVERED} recovered
 * alerts so the alerts table, status control and flyout have data to render
 * within {@link ALERT_TABLE_DATE_RANGE}.
 */
export async function generateObservabilityAlerts(esClient: Client): Promise<void> {
  await esClient.deleteByQuery({
    index: '.alerts-observability.*',
    query: { match_all: {} },
    conflicts: 'proceed',
    refresh: true,
    ignore_unavailable: true,
  });

  const operations = [
    ...Array.from({ length: ALERT_COUNTS.ACTIVE }, (_, index) => ({
      index,
      status: 'active' as const,
    })),
    ...Array.from({ length: ALERT_COUNTS.RECOVERED }, (_, index) => ({
      index: ALERT_COUNTS.ACTIVE + index,
      status: 'recovered' as const,
    })),
  ].flatMap((opts) => {
    const doc = buildAlertDoc(opts);
    return [{ index: { _index: OBSERVABILITY_ALERTS_INDEX, _id: doc['kibana.alert.uuid'] } }, doc];
  });

  await esClient.bulk({ operations, refresh: 'wait_for' });
}

export { ALERT_TABLE_DATE_RANGE };
