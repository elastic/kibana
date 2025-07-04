/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '@kbn/cases-plugin/common';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { request } from './common';

export const generateRandomStringName = (length: number) =>
  Array.from({ length }, () => Math.random().toString(36).substring(2));

export const cleanupRule = (id: string) => {
  request({
    method: 'DELETE',
    url: `/api/detection_engine/rules?id=${id}`,
    headers: {
      'elastic-api-version': '2023-10-31',
    },
  });
};

export const loadRule = (body = {}, includeResponseActions = true) =>
  request<RuleResponse>({
    method: 'POST',
    url: `/api/detection_engine/rules`,
    body: {
      type: 'query',
      index: [
        'apm-*-transaction*',
        'auditbeat-*',
        'endgame-*',
        'filebeat-*',
        'logs-*',
        'packetbeat-*',
        'traces-apm*',
        'winlogbeat-*',
        '-*elastic-cloud-logs-*',
      ],
      filters: [],
      language: 'kuery',
      query: '_id:*',
      author: [],
      false_positives: [],
      references: [],
      risk_score: 21,
      risk_score_mapping: [],
      severity: 'low',
      severity_mapping: [],
      threat: [],
      name: `Test rule ${generateRandomStringName(1)[0]}`,
      description: 'Test rule',
      tags: [],
      license: '',
      interval: '1m',
      from: 'now-360s',
      to: 'now',
      meta: { from: '1m', kibana_siem_app_url: 'http://localhost:5620/app/security' },
      actions: [],
      enabled: true,
      throttle: 'no_actions',
      ...body,
      ...(includeResponseActions
        ? {
            response_actions: [
              {
                params: { command: 'isolate', comment: 'Isolate host' },
                action_type_id: '.endpoint',
              },
              {
                params: {
                  command: 'suspend-process',
                  comment: 'Suspend host',
                  config: {
                    field: 'entity_id',
                    overwrite: false,
                  },
                },
                action_type_id: '.endpoint',
              },
              {
                params: {
                  command: 'kill-process',
                  comment: 'Kill host',
                  config: {
                    field: '',
                    overwrite: true,
                  },
                },
                action_type_id: '.endpoint',
              },
            ],
          }
        : {}),
    },
    headers: {
      'elastic-api-version': '2023-10-31',
    },
  }).then((response) => response.body);

export const loadCase = (owner: string) =>
  request<Case>({
    method: 'POST',
    url: '/api/cases',
    body: {
      title: `Test ${owner} case ${generateRandomStringName(1)[0]}`,
      tags: [],
      severity: 'low',
      description: 'Test security case',
      assignees: [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: true },
      owner,
    },
  }).then((response) => response.body);

export const cleanupCase = (id: string) => {
  request({ method: 'DELETE', url: '/api/cases', qs: { ids: JSON.stringify([id]) } });
};
