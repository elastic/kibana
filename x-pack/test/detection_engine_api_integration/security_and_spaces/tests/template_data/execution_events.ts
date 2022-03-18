/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const successfulExecution = [
  {
    '@timestamp': '2022-03-17T22:59:31.360Z',
    event: {
      provider: 'alerting',
      action: 'execute',
      kind: 'alert',
      category: ['siem'],
      start: '2022-03-17T22:59:28.100Z',
      outcome: 'success',
      end: '2022-03-17T22:59:31.283Z',
      duration: 3183000000,
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            uuid: '7e62d859-aeaa-4e3d-8b9c-b3b737356383',
            metrics: {
              number_of_triggered_actions: 0,
              number_of_searches: 2,
              es_search_duration_ms: 1,
              total_search_duration_ms: 15,
            },
          },
        },
      },
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
          type_id: 'siem.queryRule',
        },
      ],
      task: {
        scheduled: '2022-03-17T22:59:25.051Z',
        schedule_delay: 3049000000,
      },
      alerting: {
        status: 'ok',
      },
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      license: 'basic',
      category: 'siem.queryRule',
      ruleset: 'siem',
      name: 'Lots of Execution Events',
    },
    message:
      "rule executed: siem.queryRule:fb1fc150-a292-11ec-a2cf-c1b28b0392b0: 'Lots of Execution Events'",
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-17T22:59:30.296Z',
    event: {
      provider: 'securitySolution.ruleExecution',
      kind: 'metric',
      action: 'execution-metrics',
      sequence: 1,
    },
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      name: 'Lots of Execution Events',
      category: 'siem.queryRule',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            metrics: {
              total_search_duration_ms: 12,
              total_indexing_duration_ms: 0,
            },
            uuid: '7e62d859-aeaa-4e3d-8b9c-b3b737356383',
          },
        },
      },
      space_ids: ['default'],
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
        },
      ],
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-17T22:59:30.296Z',
    event: {
      provider: 'securitySolution.ruleExecution',
      kind: 'event',
      action: 'status-change',
      sequence: 2,
    },
    message: 'succeeded',
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      name: 'Lots of Execution Events',
      category: 'siem.queryRule',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            status: 'succeeded',
            status_order: 0,
            uuid: '7e62d859-aeaa-4e3d-8b9c-b3b737356383',
          },
        },
      },
      space_ids: ['default'],
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
        },
      ],
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-17T22:59:28.134Z',
    event: {
      provider: 'securitySolution.ruleExecution',
      kind: 'event',
      action: 'status-change',
      sequence: 0,
    },
    message: '',
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      name: 'Lots of Execution Events',
      category: 'siem.queryRule',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            status: 'running',
            status_order: 15,
            uuid: '7e62d859-aeaa-4e3d-8b9c-b3b737356383',
          },
        },
      },
      space_ids: ['default'],
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
        },
      ],
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-17T22:59:28.100Z',
    event: {
      provider: 'alerting',
      action: 'execute-start',
      kind: 'alert',
      category: ['siem'],
      start: '2022-03-17T22:59:28.100Z',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            uuid: '7e62d859-aeaa-4e3d-8b9c-b3b737356383',
          },
        },
      },
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
          type_id: 'siem.queryRule',
        },
      ],
      task: {
        scheduled: '2022-03-17T22:59:25.051Z',
        schedule_delay: 3049000000,
      },
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      license: 'basic',
      category: 'siem.queryRule',
      ruleset: 'siem',
    },
    message: 'rule execution start: "fb1fc150-a292-11ec-a2cf-c1b28b0392b0"',
    ecs: {
      version: '1.8.0',
    },
  },
];

export const failedGapExecution = [
  {
    '@timestamp': '2022-03-17T12:36:16.413Z',
    event: {
      provider: 'alerting',
      action: 'execute',
      kind: 'alert',
      category: ['siem'],
      start: '2022-03-17T12:36:14.868Z',
      outcome: 'success',
      end: '2022-03-17T12:36:16.413Z',
      duration: 1545000000,
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            uuid: '38fa2d4a-94d3-4ea3-80d6-d1284eb98357',
            metrics: {
              number_of_triggered_actions: 0,
              number_of_searches: 6,
              es_search_duration_ms: 2,
              total_search_duration_ms: 15,
            },
          },
        },
      },
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
          type_id: 'siem.queryRule',
        },
      ],
      task: {
        scheduled: '2022-03-17T12:27:10.060Z',
        schedule_delay: 544808000000,
      },
      alerting: {
        status: 'ok',
      },
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      license: 'basic',
      category: 'siem.queryRule',
      ruleset: 'siem',
      name: 'Lots of Execution Events',
    },
    message:
      "rule executed: siem.queryRule:fb1fc150-a292-11ec-a2cf-c1b28b0392b0: 'Lots of Execution Events'",
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-17T12:36:15.382Z',
    event: {
      provider: 'securitySolution.ruleExecution',
      kind: 'metric',
      action: 'execution-metrics',
      sequence: 1,
    },
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      name: 'Lots of Execution Events',
      category: 'siem.queryRule',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            metrics: {
              execution_gap_duration_s: 245,
            },
            uuid: '38fa2d4a-94d3-4ea3-80d6-d1284eb98357',
          },
        },
      },
      space_ids: ['default'],
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
        },
      ],
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-17T12:36:15.382Z',
    event: {
      provider: 'securitySolution.ruleExecution',
      kind: 'event',
      action: 'status-change',
      sequence: 2,
    },
    message:
      '4 minutes (244689ms) were not queried between this rule execution and the last execution, so signals may have been missed. Consider increasing your look behind time or adding more Kibana instances. name: "Lots of Execution Events" id: "fb1fc150-a292-11ec-a2cf-c1b28b0392b0" rule id: "7c44befd-f611-4994-b116-9861df75d0cb" execution id: "38fa2d4a-94d3-4ea3-80d6-d1284eb98357" space ID: "default"',
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      name: 'Lots of Execution Events',
      category: 'siem.queryRule',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            status: 'failed',
            status_order: 30,
            uuid: '38fa2d4a-94d3-4ea3-80d6-d1284eb98357',
          },
        },
      },
      space_ids: ['default'],
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
        },
      ],
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-17T12:36:14.888Z',
    event: {
      provider: 'securitySolution.ruleExecution',
      kind: 'event',
      action: 'status-change',
      sequence: 0,
    },
    message: '',
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      name: 'Lots of Execution Events',
      category: 'siem.queryRule',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            status: 'running',
            status_order: 15,
            uuid: '38fa2d4a-94d3-4ea3-80d6-d1284eb98357',
          },
        },
      },
      space_ids: ['default'],
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
        },
      ],
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-17T12:36:14.868Z',
    event: {
      provider: 'alerting',
      action: 'execute-start',
      kind: 'alert',
      category: ['siem'],
      start: '2022-03-17T12:36:14.868Z',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            uuid: '38fa2d4a-94d3-4ea3-80d6-d1284eb98357',
          },
        },
      },
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
          type_id: 'siem.queryRule',
        },
      ],
      task: {
        scheduled: '2022-03-17T12:27:10.060Z',
        schedule_delay: 544808000000,
      },
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    rule: {
      id: 'fb1fc150-a292-11ec-a2cf-c1b28b0392b0',
      license: 'basic',
      category: 'siem.queryRule',
      ruleset: 'siem',
    },
    message: 'rule execution start: "fb1fc150-a292-11ec-a2cf-c1b28b0392b0"',
    ecs: {
      version: '1.8.0',
    },
  },
];

export const partialWarningExecution = [
  {
    '@timestamp': '2022-03-16T23:28:36.012Z',
    event: {
      provider: 'alerting',
      action: 'execute',
      kind: 'alert',
      category: ['siem'],
      start: '2022-03-16T23:28:34.365Z',
      outcome: 'success',
      end: '2022-03-16T23:28:36.012Z',
      duration: 1647000000,
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            uuid: 'ce37a09d-9359-4756-abbf-e319dd6b1336',
            metrics: {
              number_of_triggered_actions: 0,
              number_of_searches: 2,
              es_search_duration_ms: 0,
              total_search_duration_ms: 3,
            },
          },
        },
      },
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'f78f3550-a186-11ec-89a1-0bce95157aba',
          type_id: 'siem.queryRule',
        },
      ],
      task: {
        scheduled: '2022-03-16T23:28:31.233Z',
        schedule_delay: 3132000000,
      },
      alerting: {
        status: 'ok',
      },
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    rule: {
      id: 'f78f3550-a186-11ec-89a1-0bce95157aba',
      license: 'basic',
      category: 'siem.queryRule',
      ruleset: 'siem',
      name: 'This Rule Makes Alerts, Actions, AND Moar!',
    },
    message:
      "rule executed: siem.queryRule:f78f3550-a186-11ec-89a1-0bce95157aba: 'This Rule Makes Alerts, Actions, AND Moar!'",
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-16T23:28:34.998Z',
    event: {
      provider: 'securitySolution.ruleExecution',
      kind: 'event',
      action: 'status-change',
      sequence: 1,
    },
    message:
      'Check privileges failed to execute ResponseError: index_not_found_exception: [index_not_found_exception] Reason: no such index [frank] name: "This Rule Makes Alerts, Actions, AND Moar!" id: "f78f3550-a186-11ec-89a1-0bce95157aba" rule id: "b64b4540-d035-4826-a1e7-f505bf4b9653" execution id: "ce37a09d-9359-4756-abbf-e319dd6b1336" space ID: "default"',
    rule: {
      id: 'f78f3550-a186-11ec-89a1-0bce95157aba',
      name: 'This Rule Makes Alerts, Actions, AND Moar!',
      category: 'siem.queryRule',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            status: 'partial failure',
            status_order: 20,
            uuid: 'ce37a09d-9359-4756-abbf-e319dd6b1336',
          },
        },
      },
      space_ids: ['default'],
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'f78f3550-a186-11ec-89a1-0bce95157aba',
        },
      ],
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-16T23:28:34.386Z',
    event: {
      provider: 'securitySolution.ruleExecution',
      kind: 'event',
      action: 'status-change',
      sequence: 0,
    },
    message: '',
    rule: {
      id: 'f78f3550-a186-11ec-89a1-0bce95157aba',
      name: 'This Rule Makes Alerts, Actions, AND Moar!',
      category: 'siem.queryRule',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            status: 'running',
            status_order: 15,
            uuid: 'ce37a09d-9359-4756-abbf-e319dd6b1336',
          },
        },
      },
      space_ids: ['default'],
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'f78f3550-a186-11ec-89a1-0bce95157aba',
        },
      ],
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    ecs: {
      version: '1.8.0',
    },
  },
  {
    '@timestamp': '2022-03-16T23:28:34.365Z',
    event: {
      provider: 'alerting',
      action: 'execute-start',
      kind: 'alert',
      category: ['siem'],
      start: '2022-03-16T23:28:34.365Z',
    },
    kibana: {
      alert: {
        rule: {
          execution: {
            uuid: 'ce37a09d-9359-4756-abbf-e319dd6b1336',
          },
        },
      },
      saved_objects: [
        {
          rel: 'primary',
          type: 'alert',
          id: 'f78f3550-a186-11ec-89a1-0bce95157aba',
          type_id: 'siem.queryRule',
        },
      ],
      task: {
        scheduled: '2022-03-16T23:28:31.233Z',
        schedule_delay: 3132000000,
      },
      server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      version: '8.2.0',
    },
    rule: {
      id: 'f78f3550-a186-11ec-89a1-0bce95157aba',
      license: 'basic',
      category: 'siem.queryRule',
      ruleset: 'siem',
    },
    message: 'rule execution start: "f78f3550-a186-11ec-89a1-0bce95157aba"',
    ecs: {
      version: '1.8.0',
    },
  },
];
