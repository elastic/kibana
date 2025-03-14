/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

// active lifecycle alert
// status = 'active', no kibana.alert.end field

// inactive lifecycle alert
// status = 'untracked' or 'recovered', exists kibana.alert.end field
// alerts can be directly untracked or will be untracked when deleted

// active security alert
// status = 'active', no kibana.alert.end field

// acknowledged security alert
// status = 'active'
// kibana.alert.workflow_status = 'acknowledged', kibana.alert.workflow_status_updated_at exists

// closed security alert
// status = 'active'
// kibana.alert.workflow_status = 'closed', kibana.alert.workflow_status_updated_at exists

const getRandomBoolean = () => (Math.floor(Math.random() * 2) === 0 ? false : true);

const getFieldsFromType = (type: string, spaceId: string) => {
  if (type === 'stack') {
    return {
      index: '.internal.alerts-stack.alerts-default-000001',
      ruleCategory: 'Elasticsearch query',
      ruleConsumer: 'stackAlerts',
      ruleType: '.es-query',
    };
  } else if (type === 'o11y') {
    return {
      index: '.internal.alerts-observability.threshold.alerts-default-000001',
      ruleCategory: 'Custom threshold',
      ruleConsumer: 'logs',
      ruleType: 'observability.rules.custom_threshold',
    };
  } else if (type === 'security') {
    return {
      index: `.internal.alerts-security.alerts-${spaceId}-000001`,
      ruleCategory: 'Custom Query Rule',
      ruleConsumer: 'siem',
      ruleType: 'siem.queryRule',
    };
  }
  throw new Error(`Invalid type ${type}`);
};

const getRecoveredAlert = (
  id: string,
  type: string,
  recoveredTime: string,
  spaceId: string = 'default',
  isUntracked: boolean = false
) => {
  const fields = getFieldsFromType(type, spaceId);
  const startTime = moment(recoveredTime).subtract(10, 'hours').toISOString();

  return {
    _index: fields.index,
    _id: id,
    _score: 1,
    _source: {
      '@timestamp': recoveredTime,
      'kibana.alert.rule.execution.timestamp': recoveredTime,
      'kibana.alert.time_range': {
        gte: startTime,
        lte: recoveredTime,
      },
      'kibana.alert.start': startTime,
      'kibana.alert.end': recoveredTime,
      'event.action': isUntracked ? 'active' : 'close',
      'kibana.alert.status': isUntracked ? 'untracked' : 'recovered',
      'kibana.alert.url':
        '/app/management/insightsAndAlerting/triggersActions/rule/854ebba1-c0c1-4ac1-88c0-72442d1137b2',
      'kibana.alert.reason':
        'Document count is 0 in the last 5d in .kibana-event-log* index. Alert when less than 0.',
      'kibana.alert.title':
        "rule 'Elasticsearch query rule - stack rules visibility - recovered alert' recovered",
      'kibana.alert.evaluation.conditions': 'Number of matching documents is NOT less than 0',
      'kibana.alert.evaluation.value': '0',
      'kibana.alert.evaluation.threshold': 0,
      'kibana.alert.rule.category': fields.ruleCategory,
      'kibana.alert.rule.consumer': fields.ruleConsumer,
      'kibana.alert.rule.rule_type_id': fields.ruleType,
      'kibana.alert.rule.execution.uuid': 'c297ed97-6f2a-4489-9ce1-e0e369857fc1',
      'kibana.alert.rule.name': 'rule',
      'kibana.alert.rule.parameters': {},
      'kibana.alert.rule.producer': 'stackAlerts',
      'kibana.alert.rule.revision': 0,
      'kibana.alert.rule.tags': [],
      'kibana.alert.rule.uuid': '854ebba1-c0c1-4ac1-88c0-72442d1137b2',
      'kibana.space_ids': [spaceId],
      'event.kind': 'signal',
      'kibana.alert.action_group': 'recovered',
      'kibana.alert.flapping': false,
      'kibana.alert.flapping_history': [true, false, true, false],
      'kibana.alert.instance.id': 'query matched',
      'kibana.alert.maintenance_window_ids': [],
      'kibana.alert.consecutive_matches': 0,
      'kibana.alert.pending_recovered_count': 0,
      'kibana.alert.uuid': 'dfc28b3a-cd8f-40bb-a002-2da894565fff',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.duration.us': 120021000,
      'kibana.version': '9.1.0',
      tags: [],
      'kibana.alert.previous_action_group': 'recovered',
    },
  };
};

const getAcknowledgedOrClosedDetectionAlert = (
  id: string,
  type: string,
  closedTime: string,
  spaceId: string = 'default',
  isClosed: boolean = false
) => {
  const fields = getFieldsFromType(type, spaceId);
  const startTime = moment(closedTime).subtract(10, 'hours').toISOString();

  return {
    _index: fields.index,
    _id: id,
    _score: 1,
    _source: {
      'kibana.alert.severity': 'low',
      'kibana.alert.workflow_status': isClosed ? 'closed' : 'acknowledged',
      'kibana.alert.start': startTime,
      'kibana.alert.workflow_status_updated_at': closedTime,
      'kibana.alert.rule.references': [],
      'kibana.alert.rule.updated_by': 'elastic',
      'kibana.alert.rule.threat': [],
      'kibana.alert.rule.description': 'test',
      'kibana.alert.rule.tags': [],
      'kibana.alert.rule.producer': 'siem',
      'kibana.alert.rule.to': 'now',
      'kibana.alert.rule.created_by': 'elastic',
      ecs: {
        version: '1.8.0',
      },
      'kibana.alert.risk_score': 21,
      'kibana.alert.rule.name': 'test',
      'event.kind': 'signal',
      'kibana.alert.rule.uuid': 'e3826f22-49f5-48c7-b7fc-129b53dadde3',
      'kibana.alert.original_event.category': ['stackAlerts'],
      'kibana.alert.rule.risk_score_mapping': [],
      'kibana.alert.rule.interval': '5m',
      'kibana.alert.reason': 'stackAlerts event created low alert test.',
      'kibana.alert.rule.type': 'query',
      'kibana.alert.workflow_user': 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      'kibana.alert.original_event.end': '2025-03-13T18:04:27.652Z',
      'kibana.alert.rule.immutable': false,
      'kibana.alert.depth': 1,
      'kibana.alert.rule.enabled': true,
      'kibana.alert.rule.version': 1,
      'kibana.alert.rule.from': 'now-6m',
      'kibana.alert.rule.parameters': {},
      'kibana.alert.rule.revision': 0,
      'kibana.alert.status': 'active',
      'kibana.alert.last_detected': '2025-03-13T18:04:42.345Z',
      'kibana.alert.ancestors': [
        {
          depth: 0,
          index: '.ds-.kibana-event-log-ds-2025.03.13-000001',
          id: 'rVWtkJUBaS1Zhvnn3ae9',
          type: 'event',
        },
      ],
      rule: {
        license: 'basic',
        ruleset: 'stackAlerts',
        name: 'Elasticsearch query rule - stack rules visibility - recovered alert',
        id: '854ebba1-c0c1-4ac1-88c0-72442d1137b2',
        category: '.es-query',
      },
      'kibana.alert.original_event.start': '2025-03-13T18:04:27.219Z',
      'kibana.alert.rule.exceptions_list': [],
      'kibana.alert.rule.actions': [],
      'kibana.alert.original_event.duration': '433000000',
      'kibana.alert.rule.rule_type_id': fields.ruleType,
      'kibana.alert.original_event.provider': 'alerting',
      'kibana.alert.rule.license': '',
      event: {
        duration: '433000000',
        provider: 'alerting',
        start: '2025-03-13T18:04:27.219Z',
        action: 'execute',
        end: '2025-03-13T18:04:27.652Z',
        category: ['stackAlerts'],
        outcome: 'success',
      },
      'kibana.alert.original_event.kind': 'alert',
      'kibana.alert.workflow_tags': [],
      'kibana.alert.workflow_assignee_ids': [],
      'kibana.alert.rule.severity_mapping': [],
      'kibana.alert.rule.max_signals': 100,
      'kibana.alert.rule.updated_at': '2025-03-13T18:04:38.248Z',
      'kibana.alert.rule.risk_score': 21,
      'kibana.alert.rule.author': [],
      'kibana.alert.rule.false_positives': [],
      message:
        "rule executed: .es-query:854ebba1-c0c1-4ac1-88c0-72442d1137b2: 'Elasticsearch query rule - stack rules visibility - recovered alert'",
      'kibana.alert.rule.consumer': fields.ruleConsumer,
      'kibana.alert.rule.indices': ['.kibana-event-log*'],
      'kibana.alert.rule.category': fields.ruleCategory,
      'kibana.alert.original_event.outcome': 'success',
      '@timestamp': '2025-03-13T18:04:42.336Z',
      'kibana.alert.original_event.action': 'execute',
      'kibana.alert.rule.created_at': '2025-03-13T18:04:38.248Z',
      'kibana.alert.rule.severity': 'low',
      'kibana.alert.intended_timestamp': '2025-03-13T18:04:42.336Z',
      'kibana.alert.rule.execution.timestamp': '2025-03-13T18:04:42.345Z',
      'kibana.alert.rule.execution.uuid': 'e8fd0690-5df6-443b-a239-2201b892b9cf',
      'kibana.space_ids': [spaceId],
      'kibana.alert.uuid': '257dd79a64d37887286d2ce025f5109f354071767b85801c7b24b89118928d08',
      'kibana.alert.rule.meta.kibana_siem_app_url': 'https://localhost:5601/app/security',
      'kibana.version': '9.1.0',
      'kibana.alert.rule.execution.type': 'scheduled',
      'kibana.alert.original_time': '2025-03-13T18:04:27.652Z',
      'kibana.alert.rule.rule_id': 'd4066053-6434-49f5-928f-73cf56097b52',
    },
  };
};

const getActiveAlert = (
  id: string,
  type: string,
  activeTime: string,
  spaceId: string = 'default'
) => {
  const fields = getFieldsFromType(type, spaceId);
  return {
    _index: fields.index,
    _id: id,
    _score: 1,
    _source: {
      'event.action': getRandomBoolean() ? 'active' : 'open',
      'kibana.alert.status': 'active',
      '@timestamp': '2025-03-13T15:32:09.536Z',
      'kibana.alert.rule.execution.timestamp': '2025-03-13T15:32:09.536Z',
      'kibana.alert.start': activeTime,
      'kibana.alert.time_range': {
        gte: activeTime,
      },
      'kibana.alert.url':
        '/app/management/insightsAndAlerting/triggersActions/rule/70d901ae-e24d-4f54-a775-6c1a5a174083',
      'kibana.alert.reason':
        'Document count is 21 in the last 5d in .kibana-event-log* index. Alert when greater than 0.',
      'kibana.alert.title':
        "rule 'Elasticsearch query rule - stack rules visibility' matched query",
      'kibana.alert.evaluation.conditions': 'Number of matching documents is greater than 0',
      'kibana.alert.evaluation.value': '21',
      'kibana.alert.evaluation.threshold': 0,
      'kibana.alert.rule.category': fields.ruleCategory,
      'kibana.alert.rule.consumer': fields.ruleConsumer,
      'kibana.alert.rule.rule_type_id': fields.ruleType,
      'kibana.alert.rule.execution.uuid': 'be66e717-62f7-42a3-90d8-bb3bf3a30d2b',
      'kibana.alert.rule.name': 'Elasticsearch query rule - stack rules visibility',
      'kibana.alert.rule.parameters': {},
      'kibana.alert.rule.producer': 'stackAlerts',
      'kibana.alert.rule.revision': 0,
      'kibana.alert.rule.tags': [],
      'kibana.alert.rule.uuid': '70d901ae-e24d-4f54-a775-6c1a5a174083',
      'kibana.space_ids': [spaceId],
      'event.kind': 'signal',
      'kibana.alert.action_group': 'query matched',
      'kibana.alert.flapping': false,
      'kibana.alert.flapping_history': [true, false, false, false],
      'kibana.alert.instance.id': 'query matched',
      'kibana.alert.maintenance_window_ids': [],
      'kibana.alert.consecutive_matches': 4,
      'kibana.alert.pending_recovered_count': 0,
      'kibana.alert.uuid': 'cd5c75f1-cdf1-4d15-9b7c-15b5c8b83fd2',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.duration.us': 180051000,
      'kibana.version': '9.1.0',
      tags: [],
      'kibana.alert.previous_action_group': 'query matched',
    },
  };
};

export const inactiveStackAlertsShouldBeDeleted = [
  // 3 stack alerts that became inactive more than 90 days ago
  {
    id: '4b26af93-e0b9-45d1-9002-42441a4f14ee',
    time: moment.utc().subtract(100, 'days').toISOString(),
  },
  {
    id: '3cc3e4f1-0a62-4dfd-b694-39f5c36ae433',
    time: moment.utc().subtract(101, 'days').toISOString(),
  },
  {
    id: '74b1ff35-8691-4a41-bb67-27f69bc5d737',
    time: moment.utc().subtract(99, 'days').toISOString(),
  },
];

export const inactiveStackAlertsShouldNotBeDeleted = [
  // 2 stack alerts that became inactive less than 90 days ago
  {
    id: 'd6f34698-4fca-4e17-bfc2-d2a10d84a19e',
    time: moment.utc().subtract(50, 'days').toISOString(),
  },
  {
    id: '8b7fa7a2-ae26-4b45-a612-74f1018c02e8',
    time: moment.utc().subtract(45, 'days').toISOString(),
  },
];

export const activeStackAlertsShouldBeDeleted = [
  // 4 stack alerts that have been active for more than 90 days
  {
    id: 'e39c8793-a0a9-4e6a-92b7-dcea46bd4e80',
    time: moment.utc().subtract(100, 'days').toISOString(),
  },
  {
    id: '23bf06ea-f3a2-42f7-816e-2ca37eb9e11d',
    time: moment.utc().subtract(150, 'days').toISOString(),
  },
  {
    id: '58993d1a-0bec-4952-a2e8-7884608f8775',
    time: moment.utc().subtract(120, 'days').toISOString(),
  },
  {
    id: '7f6fe52f-447e-4e91-b036-a9b1bb021aba',
    time: moment.utc().subtract(125, 'days').toISOString(),
  },
];

export const activeStackAlertsShouldNotBeDeleted = [
  // 1 stack alert that has been active for less than 90 days
  {
    id: 'ea673c2e-fa32-4455-9460-97112235bcd5',
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
];

export const inactiveO11yAlertsShouldBeDeleted = [
  // 2 o11y alerts that became inactive more than 90 days ago
  {
    id: 'ac4a2809-2a9e-48b9-98f0-2faaff83dc52',
    time: moment.utc().subtract(99, 'days').toISOString(),
  },
  {
    id: '6095bbed-5995-4c16-a1bf-312de2408516',
    time: moment.utc().subtract(108, 'days').toISOString(),
  },
];

export const inactiveO11yAlertsShouldNotBeDeleted = [
  // 3 o11y alerts that became inactive less than 90 days ago
  {
    id: 'c3fb1fc2-7309-44c8-b723-eb118a3f9b6e',
    time: moment.utc().subtract(10, 'days').toISOString(),
  },
  {
    id: '534ce6b6-bf83-47a7-b1be-c3846a03182e',
    time: moment.utc().subtract(5, 'days').toISOString(),
  },
  {
    id: '2ba40369-6477-4e78-ba18-a55c546fa65b',
    time: moment.utc().subtract(23, 'days').toISOString(),
  },
];

export const activeO11yAlertsShouldBeDeleted = [
  // 1 o11y alert that has been active for more than 90 days
  {
    id: 'eae0e607-1f15-4722-ad32-bbb8353a8ba5',
    time: moment.utc().subtract(98, 'days').toISOString(),
  },
];

export const activeO11yAlertsShouldNotBeDeleted = [
  // 4 o11y alerts that have been active for less than 90 days
  {
    id: '03d38d1d-f44e-4c6a-a1c8-34bbad86e29a',
    time: moment.utc().subtract(2, 'days').toISOString(),
  },
  {
    id: 'fa579125-65f0-467e-83bd-b5186492a417',
    time: moment.utc().subtract(24, 'days').toISOString(),
  },
  {
    id: '669b3dd8-85b8-4f6c-b68a-f0a845d19120',
    time: moment.utc().subtract(7, 'days').toISOString(),
  },
  {
    id: '5a6bfc58-d80b-497e-aa1b-e494c4ea6354',
    time: moment.utc().subtract(3, 'days').toISOString(),
  },
];

export const inactiveSecurityAlertsShouldBeDeleted = [
  // 5 security alerts that became inactive more than 90 days ago
  {
    id: '6219593d-92d2-4436-a294-7942ecc9ec2d',
    time: moment.utc().subtract(200, 'days').toISOString(),
  },
  {
    id: '56ab31e5-624d-42b5-980b-6fe434c3e88a',
    time: moment.utc().subtract(365, 'days').toISOString(),
  },
  {
    id: 'ef8b165c-8147-493e-9455-11dda6eb34f9',
    time: moment.utc().subtract(450, 'days').toISOString(),
  },
  {
    id: '7da21baf-3601-493a-be1e-8ea8a51eb855',
    time: moment.utc().subtract(92, 'days').toISOString(),
  },
  {
    id: 'c0fc97f9-d45b-451a-bcf8-1f9453670447',
    time: moment.utc().subtract(91, 'days').toISOString(),
  },
];

export const inactiveSecurityAlertsShouldNotBeDeleted = [
  // 1 security alert that became inactive less than 90 days ago
  {
    id: '8ec8ffe7-15f1-45b7-befb-75c2b68169b5',
    time: moment.utc().subtract(3, 'days').toISOString(),
  },
];

export const activeSecurityAlertsShouldBeDeleted = [
  // 3 security alerts that have been active for more than 90 days
  {
    id: 'c8c4ae1e-f4d1-45e3-b1dd-5da48089f4c4',
    time: moment.utc().subtract(99, 'days').toISOString(),
  },
  {
    id: '27e98d3d-0e76-4a6d-8594-62da5cf96d31',
    time: moment.utc().subtract(103, 'days').toISOString(),
  },
  {
    id: '04d1acb7-29df-4f85-9a51-9683e59dcbaa',
    time: moment.utc().subtract(102, 'days').toISOString(),
  },
];

export const activeSecurityAlertsShouldNotBeDeleted = [
  // 6 security alerts that have been active for less than 90 days
  {
    id: 'e3576ffa-cb51-4527-9b30-e82b12e7c8a7',
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    id: '879a0f8f-53eb-429c-b773-e2baf4657013',
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    id: '727589ac-27a2-489d-a790-ef2da59a1e04',
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    id: '0fed8503-01bb-4fa0-bab3-33efef5ab9bc',
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    id: '446dcee3-2c92-4a72-b6cd-9e6357283e3c',
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    id: '58f52b91-4835-4da2-8596-4052efecfefa',
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
];

export const testAlertDocs = [
  ...inactiveStackAlertsShouldBeDeleted.map((input) =>
    getRecoveredAlert(input.id, 'stack', input.time, 'space1', getRandomBoolean())
  ),
  ...inactiveStackAlertsShouldNotBeDeleted.map((input) =>
    getRecoveredAlert(input.id, 'stack', input.time, 'space1', getRandomBoolean())
  ),
  ...activeStackAlertsShouldBeDeleted.map((input) =>
    getActiveAlert(input.id, 'stack', input.time, 'space1')
  ),
  ...activeStackAlertsShouldNotBeDeleted.map((input) =>
    getActiveAlert(input.id, 'stack', input.time, 'space1')
  ),

  ...inactiveO11yAlertsShouldBeDeleted.map((input) =>
    getRecoveredAlert(input.id, 'o11y', input.time, 'space1', getRandomBoolean())
  ),
  ...inactiveO11yAlertsShouldNotBeDeleted.map((input) =>
    getRecoveredAlert(input.id, 'o11y', input.time, 'space1', getRandomBoolean())
  ),
  ...activeO11yAlertsShouldBeDeleted.map((input) =>
    getActiveAlert(input.id, 'o11y', input.time, 'space1')
  ),
  ...activeO11yAlertsShouldNotBeDeleted.map((input) =>
    getActiveAlert(input.id, 'o11y', input.time, 'space1')
  ),

  ...inactiveSecurityAlertsShouldBeDeleted.map((input) =>
    getAcknowledgedOrClosedDetectionAlert(
      input.id,
      'security',
      input.time,
      'space1',
      getRandomBoolean()
    )
  ),
  ...inactiveSecurityAlertsShouldNotBeDeleted.map((input) =>
    getAcknowledgedOrClosedDetectionAlert(
      input.id,
      'security',
      input.time,
      'space1',
      getRandomBoolean()
    )
  ),
  ...activeSecurityAlertsShouldBeDeleted.map((input) =>
    getActiveAlert(input.id, 'security', input.time, 'space1')
  ),
  ...activeSecurityAlertsShouldNotBeDeleted.map((input) =>
    getActiveAlert(input.id, 'security', input.time, 'space1')
  ),
];
