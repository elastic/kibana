/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AD2_FILE_EVENTS_INDEX,
  AD2_NETWORK_EVENTS_INDEX,
  AD2_PROCESS_EVENTS_INDEX,
  AD2_SCENARIO_ID_PREFIX,
  AD2_SCENARIO_SEED_LABEL,
} from './constants';
import type {
  Ad2IndexedAlert,
  Ad2IndexedRawEvent,
  Ad2ScenarioDefinition,
  Ad2ScenarioOs,
  Ad2ScenarioStep,
} from './types';

const isoTimestamp = (value: Date): string => value.toISOString().replace(/\.\d{3}Z$/, '.000Z');

const hostDocument = (host: string, osType: Ad2ScenarioOs): Record<string, unknown> => {
  const hostNumber = [...host].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return {
    name: host,
    hostname: host,
    id: `${AD2_SCENARIO_ID_PREFIX}host-${host}`,
    ip: [`10.50.${(hostNumber % 200) + 1}.${((hostNumber * 7) % 200) + 1}`],
    os: { type: osType, name: osType.charAt(0).toUpperCase() + osType.slice(1), version: 'test' },
  };
};

export const buildAlertDocument = (
  scenarioKey: string,
  scenario: Ad2ScenarioDefinition,
  stepNumber: number,
  step: Ad2ScenarioStep,
  timestamp: Date
): Ad2IndexedAlert => {
  const alertId = `${AD2_SCENARIO_ID_PREFIX}${scenarioKey}-alert-${stepNumber}`;
  const dataset = scenario.dataset ?? 'endpoint.alerts';
  const category = scenario.category ?? 'Endpoint Behavior Detection';
  const ancestorId = `${AD2_SCENARIO_ID_PREFIX}${scenarioKey}-process-${stepNumber}`;

  const doc: Record<string, unknown> = {
    '@timestamp': isoTimestamp(timestamp),
    ecs: { version: '9.0.0' },
    event: {
      kind: 'signal',
      category: ['intrusion_detection'],
      type: ['start'],
      module: 'endpoint',
      dataset,
      action: 'rule_detection',
      severity: step.riskScore,
      risk_score: step.riskScore,
      outcome: 'success',
    },
    data_stream: { type: 'logs', dataset, namespace: 'default' },
    labels: { ad_portable_seed: AD2_SCENARIO_SEED_LABEL, ad_test_scenario: scenarioKey },
    agent: {
      id: `${AD2_SCENARIO_ID_PREFIX}agent-${scenario.host}`,
      type: 'endpoint',
      version: '9.5.0',
    },
    host: hostDocument(scenario.host, scenario.os),
    user: { name: scenario.user, domain: 'CONTOSO' },
    message: step.message,
    rule: {
      name: step.ruleName,
      id: `${AD2_SCENARIO_ID_PREFIX}rule-${scenarioKey}-${stepNumber}`,
      description: step.message,
    },
    'kibana.alert.rule.category': category,
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.name': step.ruleName,
    'kibana.alert.rule.rule_type_id': 'siem.eqlRule',
    'kibana.alert.rule.rule_id': `${AD2_SCENARIO_ID_PREFIX}rule-${scenarioKey}-${stepNumber}`,
    'kibana.alert.rule.uuid': `${AD2_SCENARIO_ID_PREFIX}rule-${scenarioKey}-${stepNumber}`,
    'kibana.alert.rule.version': 1,
    'kibana.alert.rule.revision': 1,
    'kibana.alert.rule.description': step.message,
    'kibana.alert.rule.severity': step.severity,
    'kibana.alert.rule.risk_score': step.riskScore,
    'kibana.alert.severity': step.severity,
    'kibana.alert.risk_score': step.riskScore,
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.workflow_tags': [],
    'kibana.alert.workflow_assignee_ids': [],
    'kibana.alert.depth': 1,
    'kibana.alert.reason': step.message,
    'kibana.alert.original_time': isoTimestamp(timestamp),
    'kibana.alert.original_event.kind': 'event',
    'kibana.alert.original_event.module': 'endpoint',
    'kibana.alert.original_event.dataset': dataset,
    'kibana.alert.original_event.action': 'rule_detection',
    'kibana.alert.original_data_stream.type': 'logs',
    'kibana.alert.original_data_stream.dataset': dataset,
    'kibana.alert.original_data_stream.namespace': 'default',
    'kibana.alert.ancestors': [
      {
        id: ancestorId,
        type: 'event',
        index: AD2_PROCESS_EVENTS_INDEX,
        depth: 0,
      },
    ],
    'kibana.alert.building_block_type': null,
    'kibana.alert.uuid': alertId,
    'kibana.space_ids': ['default'],
  };

  if (step.processName) {
    doc.process = { name: step.processName, command_line: step.commandLine };
  }
  if (step.context && /^([C-Z]:\\|\/|~)/.test(step.context)) {
    doc.file = {
      path: step.context,
      name: step.context.replace(/\\/g, '/').split('/').pop(),
    };
  }

  return { id: alertId, source: doc };
};

export const buildRawEventDocuments = (
  scenarioKey: string,
  scenario: Ad2ScenarioDefinition,
  stepNumber: number,
  step: Ad2ScenarioStep,
  timestamp: Date
): Ad2IndexedRawEvent[] => {
  if (!step.processName) {
    return [];
  }

  const eventId = `${AD2_SCENARIO_ID_PREFIX}${scenarioKey}-process-${stepNumber}`;
  const host = hostDocument(scenario.host, scenario.os);
  const base = {
    '@timestamp': isoTimestamp(new Date(timestamp.getTime() - 3_000)),
    ecs: { version: '9.0.0' },
    labels: { ad_portable_seed: AD2_SCENARIO_SEED_LABEL, ad_test_scenario: scenarioKey },
    agent: {
      id: `${AD2_SCENARIO_ID_PREFIX}agent-${scenario.host}`,
      type: 'endpoint',
      version: '9.5.0',
    },
    elastic: { agent: { id: `${AD2_SCENARIO_ID_PREFIX}agent-${scenario.host}` } },
    host,
    user: { name: scenario.user, domain: 'CONTOSO' },
    message: step.message,
  };

  const commandLine = step.commandLine ?? '';
  const processDoc: Record<string, unknown> = {
    ...base,
    event: {
      id: eventId,
      kind: 'event',
      category: ['process'],
      type: ['start'],
      module: 'endpoint',
      dataset: 'endpoint.events.process',
      action: 'start',
      outcome: 'unknown',
    },
    data_stream: { type: 'logs', dataset: 'endpoint.events.process', namespace: 'default' },
    process: {
      name: step.processName,
      pid: 4000 + stepNumber,
      entity_id: `${AD2_SCENARIO_ID_PREFIX}${scenarioKey}-entity-${stepNumber}`,
      executable: step.processName,
      command_line: commandLine,
      args: commandLine.split(/\s+/).filter(Boolean),
      args_count: commandLine.split(/\s+/).filter(Boolean).length,
      parent: { name: 'parent-process', pid: 3000 + stepNumber },
    },
  };

  const docs: Ad2IndexedRawEvent[] = [
    { index: AD2_PROCESS_EVENTS_INDEX, id: eventId, source: processDoc },
  ];

  if (step.eventType === 'network' && step.context) {
    const netId = `${AD2_SCENARIO_ID_PREFIX}${scenarioKey}-network-${stepNumber}`;
    const hostIps = host.ip;
    const sourceIp =
      Array.isArray(hostIps) && typeof hostIps[0] === 'string' ? hostIps[0] : '10.0.0.1';
    docs.push({
      index: AD2_NETWORK_EVENTS_INDEX,
      id: netId,
      source: {
        ...base,
        event: {
          id: netId,
          kind: 'event',
          category: ['network'],
          type: ['start'],
          module: 'endpoint',
          dataset: 'endpoint.events.network',
          action: 'connection_attempted',
          outcome: 'success',
        },
        data_stream: { type: 'logs', dataset: 'endpoint.events.network', namespace: 'default' },
        process: processDoc.process,
        network: { direction: 'egress', transport: 'tcp', protocol: 'tls' },
        destination: { domain: step.context, ip: '203.0.113.55', port: 443 },
        source: { ip: sourceIp, port: 49152 + stepNumber },
      },
    });
  }

  if (step.eventType === 'file' && step.context) {
    const fileId = `${AD2_SCENARIO_ID_PREFIX}${scenarioKey}-file-${stepNumber}`;
    const path = step.context;
    docs.push({
      index: AD2_FILE_EVENTS_INDEX,
      id: fileId,
      source: {
        ...base,
        event: {
          id: fileId,
          kind: 'event',
          category: ['file'],
          type: ['creation'],
          module: 'endpoint',
          dataset: 'endpoint.events.file',
          action: 'creation',
          outcome: 'success',
        },
        data_stream: { type: 'logs', dataset: 'endpoint.events.file', namespace: 'default' },
        process: processDoc.process,
        file: { path, name: path.replace(/\\/g, '/').split('/').pop() },
      },
    });
  }

  return docs;
};

export const buildScenarioDocuments = (
  scenario: Ad2ScenarioDefinition,
  baseTime: Date = new Date()
): { alerts: Ad2IndexedAlert[]; rawEvents: Ad2IndexedRawEvent[] } => {
  const alerts: Ad2IndexedAlert[] = [];
  const rawEvents: Ad2IndexedRawEvent[] = [];
  const start = new Date(baseTime.getTime() - scenario.startHoursAgo * 60 * 60 * 1000);

  scenario.steps.forEach((step, index) => {
    const stepNumber = index + 1;
    const timestamp = new Date(start.getTime() + (stepNumber - 1) * 7 * 60 * 1000);
    alerts.push(buildAlertDocument(scenario.key, scenario, stepNumber, step, timestamp));
    if (scenario.raw) {
      rawEvents.push(
        ...buildRawEventDocuments(scenario.key, scenario, stepNumber, step, timestamp)
      );
    }
  });

  return { alerts, rawEvents };
};
