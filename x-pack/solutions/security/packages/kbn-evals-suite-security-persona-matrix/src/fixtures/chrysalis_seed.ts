/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const ALERT_INDEX = '.internal.alerts-security.alerts-default-000001';

interface AlertDoc {
  '@timestamp': string;
  'kibana.alert.rule.name': string;
  'kibana.alert.severity': string;
  'kibana.alert.risk_score': number;
  'kibana.alert.reason': string;
  'host.name': string;
  'user.name'?: string;
  'process.name'?: string;
  'file.hash.sha256'?: string;
  'event.category': string[];
  'event.type': string[];
  'kibana.alert.workflow_status': string;
}

const baseAlert: AlertDoc = {
  '@timestamp': new Date().toISOString(),
  'kibana.alert.rule.name': 'Suspicious BluetoothService Side-Load',
  'kibana.alert.severity': 'high',
  'kibana.alert.risk_score': 73,
  'kibana.alert.reason': 'suspicious dll load detected on Windows endpoint',
  'host.name': 'srv-win-defend-01',
  'user.name': 'SYSTEM',
  'process.name': 'BluetoothService.exe',
  'file.hash.sha256': '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
  'event.category': ['malware', 'process'],
  'event.type': ['start'],
  'kibana.alert.workflow_status': 'open',
};

export async function seedChrysalisAlerts({
  esClient,
  log,
  count = 3,
}: {
  esClient: EsClient;
  log: ToolingLog;
  count?: number;
}): Promise<void> {
  try {
    const docs = Array.from({ length: count }).map((_, i) => ({
      ...baseAlert,
      '@timestamp': new Date(Date.now() - i * 60000).toISOString(),
      'kibana.alert.risk_score': Math.max(30, 73 - i * 10),
    }));

    await esClient.bulk({
      index: ALERT_INDEX,
      refresh: 'wait_for',
      operations: docs.flatMap((doc) => [{ create: {} }, doc]),
    });
    log.info(`Seeded ${count} Chrysalis alerts into ${ALERT_INDEX}`);
  } catch (err) {
    log.warning(`Failed to seed alerts: ${err}`);
    throw err;
  }
}

export async function cleanupChrysalisAlerts({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  try {
    await esClient.deleteByQuery({
      index: ALERT_INDEX,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
    log.info(`Cleaned up alerts from ${ALERT_INDEX}`);
  } catch (err) {
    log.warning(`Cleanup warning: ${err}`);
  }
}
